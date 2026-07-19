import "dotenv/config";
import * as readline from "node:readline";
import { prisma } from "../src/db/client";
import { createAdminUser } from "../src/auth/create-admin-user";

/**
 * Interactive-only, on purpose: no `--email`/`--password` CLI flags and no
 * env vars for the password. A flag ends up in shell history and `ps`
 * output; an env var ends up sitting in a .env file indefinitely. A
 * password typed at a masked prompt exists only in this process's memory
 * for the few seconds it takes to hash it.
 *
 * This file is deliberately thin — the actual validation/creation rule
 * lives in src/auth/create-admin-user.ts and is unit-testable on its own,
 * with no stdin involved. See scripts/README.md for why: driving multiple
 * sequential readline prompts from piped/non-interactive stdin turned out
 * to be unreliable in ways that don't show up in normal interactive use,
 * so this wrapper isn't the thing worth testing directly.
 */

function prompt(rl: readline.Interface, question: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(question, (answer) => resolve(answer.trim()));
    });
}

/** Masks input with `*` as it's typed — readline has no built-in support for this. */
function promptPasswordMasked(question: string): Promise<string> {
    return new Promise((resolve) => {
        const stdin = process.stdin;
        process.stdout.write(question);

        let password = "";
        stdin.setRawMode(true);
        stdin.resume();
        stdin.setEncoding("utf8");

        const onData = (char: string) => {
            switch (char) {
                case "\n":
                case "\r":
                case "\u0004": // Ctrl-D
                    stdin.setRawMode(false);
                    stdin.pause();
                    stdin.removeListener("data", onData);
                    process.stdout.write("\n");
                    resolve(password);
                    break;
                case "\u0003": // Ctrl-C
                    process.stdout.write("\n");
                    process.exit(1);
                    break;
                case "\u007f": // Backspace
                    if (password.length > 0) {
                        password = password.slice(0, -1);
                        process.stdout.write("\b \b");
                    }
                    break;
                default:
                    password += char;
                    process.stdout.write("*");
            }
        };

        stdin.on("data", onData);
    });
}

async function main() {
    console.log("Create the admin account (interactive — nothing is read from flags/env).\n");

    const rl = readline.createInterface({input: process.stdin, output: process.stdout});
    const promptPassword = process.stdin.isTTY ? promptPasswordMasked : (q: string) => prompt(rl, q);

    try {
        const email = await prompt(rl, "Email: ");
        const password = await promptPassword("Password (min 12 chars): ");
        const confirmPassword = await promptPassword("Confirm password: ");

        if (password !== confirmPassword) {
            console.error("Passwords didn't match.");
            process.exitCode = 1;
            return;
        }

        const result = await createAdminUser(email, password);
        if (!result.ok) {
            console.error(result.error);
            process.exitCode = 1;
            return;
        }

        console.log(`\nCreated admin user ${ result.user.email } (id: ${ result.user.id }).`);
    } finally {
        rl.close();
    }
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
