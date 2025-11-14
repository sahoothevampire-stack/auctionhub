'use client';

/**
 * ApiLoader Component
 * 
 * A fixed-position loader that displays at the top of the page when API calls are in progress.
 * Prevents layout shifts by using fixed positioning.
 */
interface ApiLoaderProps {
  loading?: boolean;
}

export const ApiLoader = ({ loading = false }: ApiLoaderProps) => {
  if (!loading) return null;

  return (
    <>
      <div className="absolute left-0 right-0 top-0 z-50 flex justify-center pointer-events-none">
        <div className="loader" />
      </div>
      <style>{`
        .loader {
          height: 4px;
          width: 100%;
          --c:no-repeat linear-gradient(#ff6600 0 0);
          background: var(--c),var(--c),#d7b8fc;
          background-size: 60% 100%;
          animation: l16 3s infinite;
        }
        @keyframes l16 {
          0%   {background-position:-150% 0,-150% 0}
          66%  {background-position: 250% 0,-150% 0}
          100% {background-position: 250% 0, 250% 0}
        }
      `}</style>
    </>
  );
};
