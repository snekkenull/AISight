import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { Card } from './ui/card';

interface DashboardCardProps {
  id: string;
  children: React.ReactNode;
}

export function DashboardCard({ id, children }: DashboardCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const [height, setHeight] = useState(200);
  const [isResizing, setIsResizing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        const newHeight = Math.max(100, e.clientY - rect.top);
        setHeight(newHeight);
      }
    };

    const handleMouseUp = () => setIsResizing(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div ref={setNodeRef} style={style} className="group">
      <Card ref={cardRef} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow" style={{ height }}>
        <div className="flex items-start gap-2 p-3 h-full flex-col">
          <div className="flex items-center gap-2 w-full flex-shrink-0">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity touch-none"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="flex-1 min-w-0 overflow-y-auto">{children}</div>
          </div>
          <div
            className="w-full h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            onMouseDown={() => setIsResizing(true)}
          >
            <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
          </div>
        </div>
      </Card>
    </div>
  );
}
