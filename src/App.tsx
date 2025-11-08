import * as React from "react";
import {RootLayout} from "./layouts/RootLayout";
import {Hero} from "./blocks/Hero";
import {ProjectsGrid} from "./blocks/ProjectsGrid";
import {Principles} from "./blocks/Principles";
import {Footer} from "./blocks/Footer";
import {BootScreen} from "./boot/BootScreen.tsx";
import {BootProvider} from "./boot/BootProvider.tsx";

export default function App() {
    const [bootDone, setBootDone] = React.useState(false);
    return (
        <>
            <RootLayout>
                <BootProvider>
                    {!bootDone && <BootScreen onDone={() => setBootDone(true)} />}
                    {bootDone &&
                        <>
                            <Hero />
                            <ProjectsGrid />
                            <Principles />
                            <Footer />
                        </>
                    }
                </BootProvider>
            </RootLayout>
        </>
    );
}