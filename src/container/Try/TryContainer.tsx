const TryContainer = () => {
  return (
    <div className="w-[320px] relative">
      <div className="min-h-[420px] bg-red-400"></div>
      <div className="absolute top-0 bottom-0 w-full h-full overflow-hidden">
        <div className="absolute motion-safe:animate-updown h-full w-full border-t-4 border-white/70 z-[10]"/>
      </div>
    </div>
  );
};

export default TryContainer;