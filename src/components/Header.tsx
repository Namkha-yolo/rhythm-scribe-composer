
import { Music } from 'lucide-react';

const Header = () => {
  return (
    <header className="bg-dark-surface border-b border-dark-border">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-neon-green to-neon-blue rounded-xl">
              <Music className="w-8 h-8 text-dark-bg" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-neon-green to-neon-blue bg-clip-text text-transparent">
                BeatCraft AI
              </h1>
              <p className="text-gray-400 text-sm">Transform mouth taps into music</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
