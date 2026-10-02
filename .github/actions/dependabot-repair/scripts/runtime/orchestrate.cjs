const {execFileSync} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const {randomBytes} = require('node:crypto');
const {validateIdentity, parsePatch} = require('../artifact/artifact.cjs');
const baseEnv = () => ({PATH: process.env.PATH, HOME: process.env.HOME, SYSTEMROOT: process.env.SYSTEMROOT});
const executeDefault = (command, args, options) => execFileSync(command, args, {timeout: 20 * 60 * 1000, maxBuffer: 8 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'], ...options});
const hardened = ['--read-only', '--cap-drop=ALL', '--security-opt=no-new-privileges', '--user=1000:1000', '--memory=4g', '--cpus=2', '--pids-limit=256', '--tmpfs=/tmp:rw,nosuid,nodev,size=2g', '-e', 'HOME=/tmp/repair-home'];

async function runRepair({identity, sourceArchive, outputDirectory, apiKey, execute = executeDefault}) {
    validateIdentity(identity);
    if (!apiKey) return {status: 'unavailable'};
    const id = 'dr-' + randomBytes(4).toString('hex');
    const image = `${id}-image`, internal = `${id}-private`, egress = `${id}-egress`;
    const work = `${id}-work`, output = `${id}-output`, db = `${id}-db`, proxy = `${id}-proxy`, prep = `${id}-prep`, worker = `${id}-worker`;
    const bridges = [`br-${id}`, `be-${id}`];
    const firewall = [];
    const command = (bin, args, env = {}, input) => execute(bin, args, {env: {...baseEnv(), ...env}, input});
    const docker = (args, input) => command('docker', args, {}, input);
    const bestEffort = (bin, args) => {try {command(bin, args);} catch { /* Cleanup all remaining resources. */ }};
    fs.mkdirSync(outputDirectory, {recursive: true});
    const mount = ['--mount', `type=volume,src=${work},dst=/work`, '--mount', `type=volume,src=${output},dst=/output`];
    try {
        docker(['build', '-t', image, path.join(__dirname, '../..')]);
        docker(['network', 'create', '--internal', '--opt', `com.docker.network.bridge.name=${bridges[0]}`, internal]);
        docker(['network', 'create', '--opt', `com.docker.network.bridge.name=${bridges[1]}`, egress]);
        for (const bridge of bridges) {
            const rule = ['INPUT', '-i', bridge, '-j', 'DROP'];
            command('sudo', ['iptables', '-I', ...rule]); firewall.push(rule);
        }
        // Internal networking blocks forwarding off the bridge; INPUT blocks its host gateway.
        docker(['volume', 'create', work]); docker(['volume', 'create', output]);
        // Trusted ownership setup before any PR files enter these volumes.
        docker(['run', '--rm', '--network=none', '--cap-drop=ALL', '--cap-add=CHOWN', '--security-opt=no-new-privileges', '--user=0:0', ...mount, image, 'chown', '1000:1000', '/work', '/output']);
        docker(['run', '-d', '--rm', '--name', db, '--network', internal, '--network-alias', 'db', '--user=postgres', '--cap-drop=ALL', '--security-opt=no-new-privileges', '--memory=512m', '--pids-limit=128', '-e', 'POSTGRES_USER=portfolio', '-e', 'POSTGRES_PASSWORD=portfolio_ci', '-e', 'POSTGRES_DB=portfolio_test', 'postgres:16-alpine']);
        docker(['run', '-d', '--name', prep, '--network', internal, ...hardened, ...mount, image]);
        docker(['network', 'connect', egress, prep]);
        docker(['exec', '-i', prep, 'tar', '-xzf', '-', '--strip-components=1', '--no-same-owner', '-C', '/work'], fs.readFileSync(sourceArchive));
        docker(['exec', prep, 'sh', '-c', 'git -c init.templateDir= init && git -c core.hooksPath=/dev/null add -A && git -c core.hooksPath=/dev/null -c user.name=repair -c user.email=repair@localhost commit --allow-empty -m baseline']);
        let ready = false;
        for (let i = 0; i < 30; i++) {
            try {docker(['exec', db, 'pg_isready', '-U', 'portfolio', '-d', 'portfolio_test']); ready = true; break;} catch {await new Promise(resolve => setTimeout(resolve, 1000));}
        }
        if (!ready) throw new Error('Disposable database unavailable');
        const env = ['-e', 'DATABASE_URL=postgresql://portfolio:portfolio_ci@db:5432/portfolio_test', '-e', 'JWT_ACCESS_SECRET=ci-access-secret-not-for-real-use', '-e', 'JWT_REFRESH_SECRET=ci-refresh-secret-not-for-real-use'];
        try {
            docker(['exec', ...env, prep, 'sh', '-c', 'npm ci --include=optional && cd backend && npx --no-install prisma migrate deploy']);
        } catch {
            fs.writeFileSync(path.join(outputDirectory, 'preparation.txt'), 'Dependency preparation failed; isolated repair was still attempted.\n');
        }
        // Destroy every installation process before starting the key-holding proxy.
        docker(['rm', '-f', prep]);
        command('docker', ['run', '-d', '--name', proxy, '--network', internal, '--network-alias', 'proxy', ...hardened, '-e', 'OPENAI_API_KEY', image, 'node', '/opt/repair/scripts/proxy/proxy.cjs'], {OPENAI_API_KEY: apiKey});
        docker(['network', 'connect', egress, proxy]);
        docker(['run', '--name', worker, '--network', internal, ...hardened, ...mount, ...env, image, 'sh', '/opt/repair/scripts/runtime/repair.sh']);
        docker(['rm', '-f', proxy]);
        const patch = docker(['run', '--rm', '--network=none', ...hardened, ...mount, image, 'sh', '-c', 'git -c core.hooksPath=/dev/null -c core.fsmonitor=false add -A && git -c core.hooksPath=/dev/null -c core.fsmonitor=false diff --cached --no-ext-diff --no-textconv --binary HEAD']).toString('utf8');
        parsePatch(patch);
        const summary = docker(['run', '--rm', '--network=none', ...hardened, ...mount, image, 'head', '-c', '32768', '/output/summary.txt']);
        fs.writeFileSync(path.join(outputDirectory, 'metadata.json'), JSON.stringify(identity));
        fs.writeFileSync(path.join(outputDirectory, 'repair.patch'), patch);
        fs.writeFileSync(path.join(outputDirectory, 'summary.txt'), summary);
        return {status: 'repaired', artifactDirectory: outputDirectory};
    } catch {
        // Never echo untrusted subprocess logs as GitHub workflow commands.
        fs.writeFileSync(path.join(outputDirectory, 'failure.txt'), 'Isolated repair failed. No publication artifact was accepted.\n');
        return {status: 'failed'};
    } finally {
        for (const name of [prep, worker, proxy, db]) bestEffort('docker', ['rm', '-f', name]);
        for (const rule of firewall.reverse()) bestEffort('sudo', ['iptables', '-D', ...rule]);
        for (const name of [internal, egress]) bestEffort('docker', ['network', 'rm', name]);
        for (const name of [work, output]) bestEffort('docker', ['volume', 'rm', name]);
        bestEffort('docker', ['image', 'rm', image]);
    }
}
module.exports = {runRepair, hardened};
