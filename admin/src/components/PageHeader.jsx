export default function PageHeader({ title, subtitle, children }) {
  return (
    <div className="page-header">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {children ? <div>{children}</div> : null}
      </div>
    </div>
  );
}
