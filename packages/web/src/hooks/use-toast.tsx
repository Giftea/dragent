import { toast } from "sonner";

const variantStyles: Record<string, { border: string; title: string }> = {
  success: { border: "#16a34a", title: "#4ade80" },
  destructive: { border: "#dc2626", title: "#f87171" },
  default: { border: "#3f3f46", title: "#ffffff" },
};

export function useToast() {
  return {
    toast: ({
      title,
      description,
      variant = "default",
    }: {
      title: string;
      description?: string;
      variant?: "default" | "success" | "destructive";
    }) => {
      const { border, title: titleColor } = variantStyles[variant];
      toast(
        <div>
          <p style={{ color: titleColor, fontWeight: 600, fontSize: "14px", margin: 0 }}>
            {title}
          </p>
          {description && (
            <p style={{ color: "#a1a1aa", fontSize: "13px", margin: "2px 0 0" }}>
              {description}
            </p>
          )}
        </div>,
        {
          style: {
            background: "#18181b",
            border: `1px solid ${border}`,
            color: "white",
          },
        },
      );
    },
  };
}
