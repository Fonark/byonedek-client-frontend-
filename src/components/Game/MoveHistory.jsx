import React, { useEffect, useRef } from "react";

/**
 * MoveHistory component
 * Props:
 *   moves            - array of { san: string, color: "w"|"b" }
 *   currentMoveIndex - index of the highlighted (most recent) move (-1 = none)
 */
const MoveHistory = ({ moves = [], currentMoveIndex = -1 }) => {
  const bottomRef = useRef(null);
  const containerRef = useRef(null);

  // Auto-scroll to the latest move
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [moves.length]);

  // Build move pairs: each pair is [whiteSan, blackSan?]
  const movePairs = [];
  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({
      moveNumber: Math.floor(i / 2) + 1,
      whiteIndex: i,
      whiteSan: moves[i]?.san ?? "",
      blackIndex: i + 1,
      blackSan: moves[i + 1]?.san ?? null,
    });
  }

  if (movePairs.length === 0) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-[#A8A8A8] mb-2 px-1">
          Moves
        </h3>
        <div className="flex-1 flex items-center justify-center text-[#A8A8A8] text-sm">
          No moves yet
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-[#A8A8A8] mb-2 px-1 flex-shrink-0">
        Moves
      </h3>

      {/* Scrollable list */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto min-h-0 rounded-md"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#3d3a36 #1a1a1a",
        }}
      >
        <style>{`
          .move-scroll::-webkit-scrollbar { width: 5px; }
          .move-scroll::-webkit-scrollbar-track { background: #1a1a1a; border-radius: 4px; }
          .move-scroll::-webkit-scrollbar-thumb { background: #3d3a36; border-radius: 4px; }
          .move-scroll::-webkit-scrollbar-thumb:hover { background: #4a4744; }
        `}</style>

        <div className="move-scroll overflow-y-auto h-full">
          <table className="w-full text-sm border-collapse">
            <tbody>
              {movePairs.map((pair) => (
                <tr
                  key={pair.moveNumber}
                  className={`
                    transition-colors duration-150
                    ${pair.moveNumber % 2 === 0 ? "bg-[#1e1c1a]" : "bg-transparent"}
                  `}
                >
                  {/* Move number */}
                  <td className="text-[#A8A8A8] text-xs w-8 pl-2 py-1 select-none font-mono">
                    {pair.moveNumber}.
                  </td>

                  {/* White move */}
                  <td className="py-1 pr-1">
                    <span
                      className={`
                        px-2 py-0.5 rounded font-mono transition-colors duration-150 cursor-default
                        ${pair.whiteIndex === currentMoveIndex
                          ? "bg-[#81B64C] text-[#161512] font-bold"
                          : "text-white hover:bg-[#302E2B]"
                        }
                      `}
                    >
                      {pair.whiteSan}
                    </span>
                  </td>

                  {/* Black move */}
                  <td className="py-1 pr-2">
                    {pair.blackSan !== null && (
                      <span
                        className={`
                          px-2 py-0.5 rounded font-mono transition-colors duration-150 cursor-default
                          ${pair.blackIndex === currentMoveIndex
                            ? "bg-[#81B64C] text-[#161512] font-bold"
                            : "text-white hover:bg-[#302E2B]"
                          }
                        `}
                      >
                        {pair.blackSan}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Invisible sentinel for auto-scroll */}
          <div ref={bottomRef} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
};

export default MoveHistory;
