import { toast } from "sonner";

export function useToast() {
  return {
    toast: ({
      title,
      description,
    }: {
      title: string;
      description?: string;
    }) => {
      toast(
        <div>
          <p className="text-lg font-semibold">{title}</p>
          {description && <p>{description}</p>}
        </div>,
      );
    },
  };
}
