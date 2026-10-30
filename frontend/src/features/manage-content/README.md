# Manage content

Shared publication, preview, navigation and destructive-action sequencing. The action port contains no Post/Work API knowledge. A synchronous lock serializes actions before disabled controls render. Publication flushes before validation and requires a new confirmation if the reviewed edit revision changed. Delete/discard await any blur save before mutating. Preview opens a blank tab during the gesture, severs its opener and closes it on save failure.

Views adapt their controllers to the port and provide publication summaries. Native dialogs keep focus contained and restore the trigger on close. Server publish validation remains authoritative.
