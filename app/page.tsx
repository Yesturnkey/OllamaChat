import { AIChat } from "@/app/components/AIChat";
import { ReduxProvider } from "@/app/components/providers";

export default function TTSPage() {
  return (
    <ReduxProvider>
      <AIChat />
    </ReduxProvider>
  );
}
