import type { PolicyDocument } from "./policy-document";

/** The one address of this policy; change it here and everywhere it is shown follows. */
export const PRIVACY_CONTACT_EMAIL = "privacy@yuriisoft.me";

const CONTACT_LINK = `[${ PRIVACY_CONTACT_EMAIL }](mailto:${ PRIVACY_CONTACT_EMAIL })`;

/**
 * Privacy policy of the Android app IP Cameras Hub. The source text lives in the
 * app repository (`docs/release/privacy-policy.md`); this file is its copy for the
 * public page, so a change is made there first and copied here.
 */
export const IP_CAMERAS_HUB_POLICY: PolicyDocument = {
    title: "Privacy Policy for IP Cameras Hub",
    updated: "2026-11-17",
    intro:
        "This policy explains what the Android app **IP Cameras Hub** (\"the app\") does with information. "
        + "It covers the app only. It does not cover the website `yuriisoft.me`, the cameras you connect, "
        + "or the services of their makers.",
    sections: [
        {
            heading: "1. Who is responsible",
            blocks: [
                {
                    kind: "paragraph",
                    text: "The app is made and published by **Yurii Surzhykov**, an individual developer in the United States (\"I\", \"me\").",
                },
                { kind: "paragraph", text: `Questions about this policy: ${ CONTACT_LINK }` },
            ],
        },
        {
            heading: "2. In short",
            blocks: [
                {
                    kind: "list",
                    items: [
                        "The app has **no account** and no sign-in to any service of mine.",
                        "Everything the app keeps stays **on your phone**. I receive none of it.",
                        "The app has **no advertising, no analytics and no crash-reporting service** of its own.",
                        "The picture and the sound go **directly between your phone and your camera**. They do not pass through me or any server of mine.",
                        "The microphone is used **only while you hold the talk button**.",
                    ],
                },
            ],
        },
        {
            heading: "3. What the app handles and where it goes",
            blocks: [
                {
                    kind: "table",
                    table: {
                        columns: ["What", "Where it is", "Does it leave your phone?"],
                        rows: [
                            [
                                "**The list of your cameras**: names, addresses and the settings you choose for each camera",
                                "A private folder of the app on your phone",
                                "No",
                            ],
                            [
                                "**Camera logins**: the user name and password of each camera",
                                "A private file of the app on your phone, encrypted with a key held in the Android Keystore",
                                "Only to the camera it belongs to, to sign in to that camera",
                            ],
                            [
                                "**App settings**: the network choice, the screen-on switch, the appearance",
                                "A private file of the app on your phone",
                                "No",
                            ],
                            [
                                "**Live picture and sound** from a camera",
                                "Shown on the screen while you watch; the app does not record them",
                                "Only between the camera and your phone",
                            ],
                            [
                                "**Your voice**, when you talk to a camera",
                                "The microphone is open only while you hold the talk button; the app does not save it",
                                "Only to the camera you are talking to",
                            ],
                            [
                                "**Snapshots** you take",
                                "Saved to your phone's gallery, in its Pictures folder",
                                "No, unless you or another app on your phone shares them",
                            ],
                            [
                                "**The camera list file**, if you use \"Backup of the cameras\"",
                                "A file in the place you choose; it holds camera names and addresses and **no passwords**",
                                "No, unless you move or share it",
                            ],
                            [
                                "**The diagnostic report**, if you tap \"Copy report\"",
                                "The clipboard of your phone; it holds counters and timings of the connection (decoder, frames, delay, sound) and the name you gave the camera, and **no passwords**",
                                "No, unless you paste it somewhere",
                            ],
                        ],
                    },
                },
                {
                    kind: "paragraph",
                    text: "I do not receive, collect, sell or share any of this, because the app sends none of it to me.",
                },
            ],
        },
        {
            heading: "4. Finding cameras and the network",
            blocks: [
                {
                    kind: "paragraph",
                    text: "When you ask the app to find cameras, it looks for them on the network your phone is connected to and tries the addresses and the logins you give it.",
                },
                {
                    kind: "paragraph",
                    text: "By default the app uses Wi-Fi. It sends the picture and the sound of a camera over **mobile data only when you have allowed it**. The app asks before it does.",
                },
                {
                    kind: "paragraph",
                    text: "Many cameras use protocols without encryption on the local network (for example RTSP and ONVIF). The app cannot make a camera encrypt its traffic. Use a network you trust.",
                },
            ],
        },
        {
            heading: "5. Permissions",
            blocks: [
                {
                    kind: "table",
                    table: {
                        columns: ["Permission", "Why the app asks for it"],
                        rows: [
                            [
                                "Internet, network state, change network state, change Wi-Fi state",
                                "To reach your cameras, to ask Android for the network a camera is on (Wi-Fi, or mobile data only when you allow it) and to know which network is in use",
                            ],
                            ["Keep the device awake", "To hold a fast Wi-Fi connection while you watch a camera"],
                            ["Microphone", "To let you talk to a camera while you hold the button"],
                            [
                                "Audio settings",
                                "To put the phone's sound in call mode only while you talk to a camera, and to put it back afterwards",
                            ],
                        ],
                    },
                },
            ],
        },
        {
            heading: "6. Services of other companies",
            blocks: [
                {
                    kind: "list",
                    items: [
                        "The app contains no advertising or analytics software and sends nothing to such companies.",
                        "**Google**: if you installed the app from Google Play, Google may receive crash and performance information under your own device settings and Google's policies. I see only the summaries that Google Play shows me. See [policies.google.com/privacy](https://policies.google.com/privacy).",
                        "**Your cameras**: a camera and its maker's own app or cloud service are outside this app. This policy does not describe them.",
                    ],
                },
            ],
        },
        {
            heading: "7. How long data is kept, and deleting it",
            blocks: [
                {
                    kind: "list",
                    items: [
                        "**Remove a camera** in the app: the app forgets that camera and its password.",
                        "**Uninstall the app**: the camera list, the logins and the settings are deleted with it. The app does not use Android's cloud backup.",
                        "**Snapshots, backup files and anything you copied** stay where you put them until you delete them. They are outside the app.",
                    ],
                },
            ],
        },
        {
            heading: "8. Security",
            blocks: [
                {
                    kind: "list",
                    items: [
                        "Camera logins are encrypted on your phone, and the key is held by the Android Keystore.",
                        "Nothing is sent to me, so there is nothing on my side to leak.",
                        "Protect your phone with a screen lock. Anyone who can unlock it can open the app.",
                        "A camera on your local network may not encrypt its traffic (section 4).",
                    ],
                },
            ],
        },
        {
            heading: "9. Your choices and your rights",
            blocks: [
                {
                    kind: "paragraph",
                    text: "You control your information on your phone: you add, change and remove cameras, you choose when to use the microphone, and you decide where snapshots and backups go.",
                },
                {
                    kind: "paragraph",
                    text: "Because I do not receive or hold your data, I have nothing to look up, export, correct or delete for you. If you write to me, I use your message and your email address only to answer, and I keep them only as long as I need to handle your question.",
                },
            ],
        },
        {
            heading: "10. Children",
            blocks: [
                {
                    kind: "paragraph",
                    text: "The app is a tool for people who manage cameras. It is not directed to children under 13, and I do not knowingly collect information from anyone, including children.",
                },
            ],
        },
        {
            heading: "11. Changes to this policy",
            blocks: [
                {
                    kind: "paragraph",
                    text: "When the policy changes, I change the date at the top and update it in the app with the next release. If a change makes the app collect or share information, I will say so here and in the app before the change takes effect.",
                },
            ],
        },
        {
            heading: "12. Contact",
            blocks: [
                { kind: "paragraph", text: "Yurii Surzhykov, United States" },
                { kind: "paragraph", text: `Email: ${ CONTACT_LINK }` },
            ],
        },
    ],
};
