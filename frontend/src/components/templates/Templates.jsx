import { Page, PageBody, PageHeader, Toolbar, ContentGrid, SplitPane } from "../product/Page";
import { Card } from "../ui/card";

export function MarketingTemplate({ children, className = "" }) {
  return <div className={`min-h-screen bg-[var(--surface-page)] text-[var(--text-primary)] ${className}`}>{children}</div>;
}

export function AuthTemplate({ title, description, children, aside }) {
  return (
    <main className="grid min-h-screen grid-cols-1 bg-[var(--surface-page)] lg:grid-cols-[6fr_4fr]">
      <section className="flex items-center justify-center p-3 md:p-5">
        <div className="w-full max-w-[440px]">
          <div className="mb-4">
            <p className="fd-eyebrow">FounDesk</p>
            <h1 className="mt-2 text-[32px]">{title}</h1>
            {description && <p className="mt-2 text-[15px] text-[var(--text-muted)]">{description}</p>}
          </div>
          {children}
        </div>
      </section>
      <aside className="hidden border-l border-[var(--border-subtle)] bg-[var(--linen-100)] p-5 lg:flex lg:items-end">
        {aside}
      </aside>
    </main>
  );
}

export function BriefingTemplate({ header, focus, secondary, list }) {
  return (
    <Page>
      {header}
      <SplitPane>
        <div>{focus}</div>
        <div>{secondary}</div>
      </SplitPane>
      {list}
    </Page>
  );
}

export function WorkspaceTemplate({ eyebrow, title, description, actions, tabs, toolbar, children }) {
  return (
    <Page>
      <PageHeader eyebrow={eyebrow} title={title} description={description} actions={actions} />
      {tabs}
      {toolbar && <Toolbar>{toolbar}</Toolbar>}
      <PageBody>{children}</PageBody>
    </Page>
  );
}

export function BoardTemplate({ columns }) {
  return (
    <div className="grid grid-cols-1 gap-2 xl:grid-cols-5">
      {columns.map((column) => (
        <Card key={column.key} tone="muted" padding="p-2" className="min-h-[360px]">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-ui text-[13px] font-medium tracking-[0]">{column.title}</h3>
            <span className="font-mono text-[12px] text-[var(--text-subtle)]">{column.items?.length || 0}</span>
          </div>
          <div className="flex flex-col gap-2">{column.children}</div>
        </Card>
      ))}
    </div>
  );
}

export function SettingsTemplate({ nav, children }) {
  return (
    <ContentGrid>
      <aside className="md:col-span-3">{nav}</aside>
      <section className="md:col-span-9">{children}</section>
    </ContentGrid>
  );
}

export function BillingTemplate({ summary, plans, details }) {
  return (
    <PageBody>
      {summary}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">{plans}</div>
      {details}
    </PageBody>
  );
}

export function DataTemplate({ toolbar, children }) {
  return (
    <PageBody>
      {toolbar && <Toolbar>{toolbar}</Toolbar>}
      {children}
    </PageBody>
  );
}
