import { Icon } from "./Icon";

interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
}

export function EmptyState({ icon = "check-circle", title, message }: EmptyStateProps) {
  return (
    <div className="empty">
      <div className="ring">
        <Icon name={icon} size={28} />
      </div>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
    </div>
  );
}
