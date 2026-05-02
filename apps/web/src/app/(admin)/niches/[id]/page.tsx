export default function NicheEditorPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="h-[calc(100vh-49px)] flex">
      {/* Left: AI Chat pane */}
      <div className="w-80 border-r flex flex-col">
        <div className="px-4 py-3 border-b text-sm font-medium">
          AI Assistant
        </div>
        <div className="flex-1 overflow-y-auto p-4 text-sm text-muted-foreground">
          {/* TODO: <ChatPane nicheId={params.id} /> */}
          Chat pane — coming next sprint
        </div>
      </div>

      {/* Center: JSON editor pane */}
      <div className="flex-1 flex flex-col">
        <div className="px-4 py-3 border-b text-sm font-medium flex items-center gap-2">
          schema.json
          <span className="text-xs text-muted-foreground font-mono">
            {params.id}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 text-sm text-muted-foreground">
          {/* TODO: <SchemaEditor nicheId={params.id} /> */}
          JSON editor — coming next sprint
        </div>
      </div>

      {/* Right: Notion preview pane */}
      <div className="w-80 border-l flex flex-col">
        <div className="px-4 py-3 border-b text-sm font-medium">
          Notion Preview
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {/* TODO: <NotionPreviewPane nicheId={params.id} /> */}
          <div className="text-sm text-muted-foreground">
            Preview — coming next sprint
          </div>
        </div>
        <div className="p-3 border-t flex gap-2">
          <button
            className="flex-1 text-sm rounded-md border h-8 px-3 hover:bg-accent transition-colors"
            disabled
          >
            Pull from Notion
          </button>
          <button
            className="flex-1 text-sm rounded-md bg-primary text-primary-foreground h-8 px-3 hover:bg-primary/90 transition-colors"
            disabled
          >
            Deploy
          </button>
        </div>
      </div>
    </div>
  );
}
