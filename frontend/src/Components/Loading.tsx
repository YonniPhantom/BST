import React from 'react';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
}

const Loading: React.FC<LoadingProps> = ({ 
  size = 'md', 
  text = 'Cargando...', 
  fullScreen = false 
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const containerClasses = fullScreen 
    ? 'fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center'
    : 'flex items-center justify-center p-8 min-h-[calc(100vh-10rem)]';

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center space-y-4">
        {/* Spinner principal */}
        <div className="relative">
          <div className={`${sizeClasses[size]} border-4 border-gray-200 rounded-full animate-spin`}>
            <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
          </div>
          
          {/* Puntos orbitales */}
          <div className="absolute inset-0 animate-pulse">
            <div className="absolute top-0 left-1/2 w-2 h-2 bg-blue-400 rounded-full transform -translate-x-1/2 -translate-y-1 animate-bounce"></div>
            <div className="absolute bottom-0 left-1/2 w-2 h-2 bg-purple-400 rounded-full transform -translate-x-1/2 translate-y-1 animate-bounce" style={{ animationDelay: '0.5s' }}></div>
            <div className="absolute left-0 top-1/2 w-2 h-2 bg-green-400 rounded-full transform -translate-y-1/2 -translate-x-1 animate-bounce" style={{ animationDelay: '1s' }}></div>
            <div className="absolute right-0 top-1/2 w-2 h-2 bg-pink-400 rounded-full transform -translate-y-1/2 translate-x-1 animate-bounce" style={{ animationDelay: '1.5s' }}></div>
          </div>
        </div>

        {/* Texto de carga */}
        {text && (
          <div className="text-center">
            <p className={`${textSizeClasses[size]} font-medium text-gray-700 animate-pulse`}>
              {text}
            </p>
            <div className="flex justify-center mt-2 space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Componente de loading para pantalla completa con overlay
export const FullScreenLoading: React.FC<{ text?: string }> = ({ text }) => (
  <Loading fullScreen={true} size="lg" text={text} />
);

// Componente de loading inline pequeño
export const InlineLoading: React.FC<{ text?: string }> = ({ text }) => (
  <Loading size="sm" text={text} />
);

// Componente de loading para botones
export const ButtonLoading: React.FC = () => (
  <div className="flex items-center space-x-2">
    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
    <span>Procesando...</span>
  </div>
);

export default Loading;