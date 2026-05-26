interface StarsProps {
  count?: number;
}

export function Stars({ count = 5 }: StarsProps) {
  return <span className="stars">{"★ ".repeat(count).trim()}</span>;
}
