
interface RillaAIInfoProps {
  isProcessing: boolean;
}

const RillaAIInfo = ({ isProcessing }: RillaAIInfoProps) => {
  if (isProcessing) return null;

  return (
    <div className="bg-muted/10 p-3 rounded-lg border border-dark-border">
      <p className="text-xs text-gray-400 mb-1">Powered by Rilla AI + Enhanced Audio:</p>
      <div className="text-xs space-y-1">
        <p className="text-neon-blue">• Claude 3.5 Sonnet - Melody Analysis & Musical Theory</p>
        <p className="text-neon-green">• LLaMA 4 Maverick - Instrument Parameter Generation</p>
        <p className="text-neon-purple">• Enhanced Audio Synthesis - Realistic Instrument Modeling</p>
      </div>
    </div>
  );
};

export default RillaAIInfo;
