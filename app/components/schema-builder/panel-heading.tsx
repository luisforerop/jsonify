type PanelHeadingProps = {
  eyebrow: string;
  title: string;
  badge: string;
};

export function PanelHeading({ eyebrow, title, badge }: PanelHeadingProps) {
  return (
    <div className="panel-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      <span className="count-badge">{badge}</span>
    </div>
  );
}
