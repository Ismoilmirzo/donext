import Button from '../ui/Button';

export default function RerollButton({ remaining = 1, onClick, hidden = false }) {
  if (hidden) return null;

  return (
    <Button variant="secondary" onClick={onClick} disabled={remaining <= 0}>
      🎲 Pick a different one ({remaining})
    </Button>
  );
}
