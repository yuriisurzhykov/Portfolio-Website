import { MermaidDiagram } from "@/shared/ui/diagram/MermaidDiagram";

const SAMPLE = `flowchart LR
A[Actor or UI Component] --> B[Secured FlowBus]

B --> C[Validation]
C --> D[Permission Check]
D --> E[Flow Communication]

E --> F[Shared Event Stream]
E --> G[Runtime Sticky Storage]

B --> H[Persistable Event Registry]
H --> I[(Room Database)]

B --> J[Sticky Event Factory]

K[KSP Code Generation] --> H
K --> J
K --> L[Generated Entities, DAOs and Mappers]
L --> I`;

export default function DevDiagramPreviewPage() {
    return (
        <div className="p-xl max-w-2xl mx-auto">
            <MermaidDiagram source={SAMPLE} />
        </div>
    );
}