import { redirect } from "next/navigation";

/** `/admin` itself has no content of its own — Journal is the default landing spot once signed in. */
export default function Page() {
    redirect("/admin/journal");
}
