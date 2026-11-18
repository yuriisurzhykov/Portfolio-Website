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
                        "Your camera list, logins and settings stay **on your phone**, except for the logins sent to your camera. **Crash reports** can be sent to me through Google Firebase Crashlytics; you can turn them off (section 6).",
                        "The app has **no advertising**. **Usage and protocol analytics are optional** and are processed through Firebase Analytics only with your consent, separately from crash reports (section 6).",
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
                                "**A crash report**, when the app crashes and you have not turned the reports off",
                                "Sent to Google Firebase Crashlytics; what it holds is in section 6",
                                "Yes, to Google, for me",
                            ],
                            [
                                "**Usage and protocol analytics**: visits to named screens, feature use, connection outcomes and technical measurements",
                                "Processed through Firebase Analytics as described in section 6",
                                "Only when you enable analytics",
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
                    text: "I receive crash reports through Google as described below. When you enable analytics, I also receive usage and protocol analytics through Google. I do not sell your information or use it for advertising.",
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
                                "To reach your cameras, to ask Android for the network a camera is on (Wi-Fi, or mobile data only when you allow it) and to know which network is in use; Internet access also allows the reports described in section 6",
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
                        "The app contains no advertising software. Crash reporting and usage analytics serve different purposes and have separate controls.",
                        "**Google Firebase Crashlytics** (Google LLC): when the app crashes, and unless you turn it off under Settings, Diagnostics, Send crash reports, the app sends a crash report. "
                        + "It holds the kind of the problem and the lines of the code where it happened, the model of the phone, its version of Android, the version of the app, the state of the app at the crash and a number that Firebase makes for this installation. "
                        + "The app removes the addresses and the logins of cameras from the text of the report before it goes. "
                        + "A crash in the native code that plays the video may also bring a small part of the memory of the app, which cannot be cleaned. "
                        + "A report is not made to hold a picture, a sound, the list of your cameras or a password. "
                        + "Google processes the reports for me. It keeps crash traces, extracted native-crash data and associated identifiers for 90 days before starting removal from live and backup systems; native minidumps are processed temporarily and then discarded. "
                        + "Turning the switch off stops the reports and deletes those that were not sent yet. "
                        + "See [firebase.google.com/support/privacy](https://firebase.google.com/support/privacy).",
                        "**Google**: if you installed the app from Google Play, Google may receive crash and performance information under your own device settings and Google's policies. I see only the summaries that Google Play shows me. See [policies.google.com/privacy](https://policies.google.com/privacy).",
                        "**Your cameras**: a camera and its maker's own app or cloud service are outside this app. This policy does not describe them.",
                    ],
                },
                { kind: "subheading", text: "Firebase Analytics" },
                {
                    kind: "paragraph",
                    text: "**Firebase Analytics (Google Analytics for Firebase, Google LLC)** processes usage and protocol analytics for me when you enable analytics in the app.",
                },
                {
                    kind: "paragraph",
                    text: "Analytics collection requires your consent. You can use the app without enabling analytics and withdraw your consent in the app's settings. Enabling crash reports does not enable usage analytics.",
                },
                { kind: "paragraph", text: "Analytics covers these categories of data:" },
                {
                    kind: "list",
                    items: [
                        "**App usage**: visits to fixed screen names, such as the camera wall, viewer, settings and diagnostics; time spent on those screens; and whether actions such as adding a camera or starting playback succeeded. Camera names, addresses, search text and other text you enter are excluded from screen names and event values.",
                        "**Failures and performance**: connection and playback failures, retries, stalls, time to the first frame, decoder type, dropped frames, packet loss, jitter and audio interruptions. These can include problems the app recovers from, not only crashes.",
                        "**Protocol compatibility**: structured information about negotiation, delivery and failures for the protocols used by a connection, such as RTSP, RTP, RTCP or SRTP; codecs and transport types. The information concerns the connection's technical behaviour, not the picture or sound it carries.",
                        "**Technical context**: app version, Android version, phone model, event times and an app-instance identifier generated by Firebase. Firebase Analytics also processes automatic app events and technical device information. Google receives the phone's public IP address when it connects to the service and can use it to derive approximate location. These reports are not anonymous because they include an app-instance identifier.",
                    ],
                },
                {
                    kind: "paragraph",
                    text: "I use these data to learn which screens and features are used most, find and fix failures, and build a technical compatibility dataset for camera and protocol combinations I cannot test personally. The purpose is to improve this app and its camera library. I do not use these data for advertising or to identify people in camera footage.",
                },
                {
                    kind: "paragraph",
                    text: "Custom analytics events **exclude camera names, camera IP or MAC addresses, full URLs, logins, passwords, authentication headers, encryption keys, raw protocol messages or packet captures, pictures, video, audio and microphone recordings**. Structured diagnostic summaries are different from the report you copy to the clipboard, which can contain a camera name. The app does not upload that copied report automatically as analytics. Native crash reporting has the separate limitations described above.",
                },
                {
                    kind: "paragraph",
                    text: "Google processes analytics data through its infrastructure, which can involve processing outside your country. See [Google's privacy policy](https://policies.google.com/privacy) and [Firebase's privacy information](https://firebase.google.com/support/privacy).",
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
                        "**Crash reports** that were already sent are kept by Google for 90 days before removal begins (section 6). Turn the reports off to stop new ones.",
                        `**Firebase Analytics data** is subject to the retention settings of the Google Analytics property. These settings apply to user-level and event-level data; aggregated reports have separate retention rules. Turning analytics off stops new collection but does not by itself delete information already sent. Contact ${ CONTACT_LINK } for a deletion request (section 9). See [Google Analytics data retention](https://support.google.com/analytics/answer/7667196).`,
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
                        "Crash reports are processed by Google for me. Firebase uses HTTPS to protect data in transit. No system can guarantee absolute security.",
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
                    text: "You control your information on your phone: you add, change and remove cameras, you choose when to use the microphone, you decide where snapshots and backups go, and you can turn the crash reports off at any time under Settings, Diagnostics. Usage analytics requires a separate choice; you can withdraw that consent in the app's settings without losing access to camera features.",
                },
                {
                    kind: "paragraph",
                    text: `For questions or requests to access, correct or delete information processed for me, contact ${ CONTACT_LINK }. Your rights depend on the law that applies to you. Reports may not contain enough information for me to identify which ones relate to you; I will explain any limits when answering. Withdrawing consent does not affect the lawfulness of processing carried out before withdrawal.`,
                },
                {
                    kind: "paragraph",
                    text: "If you write to me, I use your message and your email address only to answer, and I keep them only as long as I need to handle your question.",
                },
            ],
        },
        {
            heading: "10. Children",
            blocks: [
                {
                    kind: "paragraph",
                    text: "The app is a tool for people who manage cameras. It is not directed to children under 13, and I do not knowingly collect personal information from children under 13. If you believe a child has provided personal information, contact me so I can investigate and address it.",
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
