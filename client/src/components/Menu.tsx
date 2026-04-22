import {
  cloneElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import "./Menu.css";

export interface MenuItem {
  key: string;
  label: string;
  onSelect: () => void;
  danger?: boolean;
  icon?: ReactNode;
  disabled?: boolean;
}

interface MenuProps {
  /** The element that triggers the menu when clicked. Must forward a ref and accept onClick. */
  trigger: ReactElement<{
    onClick?: (e: React.MouseEvent) => void;
    "aria-haspopup"?: "menu";
    "aria-expanded"?: boolean;
    "aria-controls"?: string;
  }>;
  items: MenuItem[];
  align?: "left" | "right";
  onSelect?: (key: string) => void;
}

/**
 * Small, self-contained popover menu — click trigger to open, click outside
 * or press Escape to close. Rendered inline beneath the trigger, so use
 * `position: relative` on an ancestor if you want it to anchor to a card.
 */
export function Menu({
  trigger,
  items,
  align = "right",
  onSelect,
}: MenuProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLSpanElement | null>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent): void => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const triggerEl = cloneElement(trigger, {
    onClick: (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      trigger.props.onClick?.(e);
      setOpen((v) => !v);
    },
    "aria-haspopup": "menu",
    "aria-expanded": open,
    "aria-controls": menuId,
  });

  return (
    <span className="menu-root" ref={rootRef}>
      {triggerEl}
      {open && (
        <div
          role="menu"
          id={menuId}
          className={`menu-panel menu-panel--${align}`}
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              className={`menu-item${item.danger ? " menu-item--danger" : ""}`}
              disabled={item.disabled}
              onClick={() => {
                close();
                item.onSelect();
                onSelect?.(item.key);
              }}
            >
              {item.icon && <span className="menu-item__icon">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </span>
  );
}
