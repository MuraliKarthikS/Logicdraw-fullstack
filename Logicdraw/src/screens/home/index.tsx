// index.tsx (modern DnD-Kit version replacing react-draggable)
import { useEffect, useRef, useState, useCallback } from "react";
import { SWATCHES } from "@/constants";
import { ColorSwatch, Group } from "@mantine/core";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { DndContext, useDraggable, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";

interface GeneratedResult {
  expression: string;
  answer: string;
}

function DraggableLatex({ id, latex, top, left }: { id: string; latex: string; top: number; left: number }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    position: "absolute" as const,
    top,
    left,
    zIndex: isDragging ? 40 : 30,
    touchAction: "none",
    cursor: isDragging ? "grabbing" : "grab",
  };

  useEffect(() => {
    window.MathJax && window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
  }, [latex, top, left]);

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <div
        className="p-2 bg-white bg-opacity-80 rounded shadow-md text-black latex-container"
        // Render as text, not HTML
      >
        {latex}
      </div>
    </div>
  );
}

export default function Home() {
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("rgb(255, 255, 255)");
  const [reset, setReset] = useState(false);
  const [result, setResult] = useState<GeneratedResult>();
  const [dictofVars, setDictofVars] = useState({});
  const [isErasing, setIsErasing] = useState(false);
  const [eraserSize, setEraserSize] = useState(20);
  const [latexBlocks, setLatexBlocks] = useState<{ id: string; latex: string; top: number; left: number }[]>([]);
  
  // New states for click-to-place functionality
  const [pendingResult, setPendingResult] = useState<{ expression: string; answer: string } | null>(null);
  const [isPlacingResult, setIsPlacingResult] = useState(false);

  const resizeCanvas = useCallback(() => {
    const bgCanvas = bgCanvasRef.current;
    const drawCanvas = drawCanvasRef.current;
    if (bgCanvas && drawCanvas) {
      bgCanvas.width = drawCanvas.width = window.innerWidth;
      bgCanvas.height = drawCanvas.height = window.innerHeight;
      const bgCtx = bgCanvas.getContext("2d");
      if (bgCtx) {
        bgCtx.fillStyle = "black";
        bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
      }
    }
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML";
    script.async = true;
    document.head.appendChild(script);
    script.onload = () => {
      // @ts-ignore
      window.MathJax.Hub.Config({
        tex2jax: { inlineMath: [["$", "$"], ["\\(", "\\)"]] },
      });
      
      // Add CSS for Patrick Hand font on MathJax elements
      const style = document.createElement('style');
      style.textContent = `
        .latex-container .MathJax {
          font-family: 'Patrick Hand', cursive !important;
        }
        .latex-container .MathJax_Display {
          font-family: 'Patrick Hand', cursive !important;
        }
        .latex-container .MathJax_MathML {
          font-family: 'Patrick Hand', cursive !important;
        }
      `;
      document.head.appendChild(style);
    };
    return () => {
        document.head.removeChild(script);
    };
  }, []);

  // Remove latexExpression effect
  // useEffect(() => {
  //   if (latexExpression.length > 0 && window.MathJax) {
  //     // @ts-ignore
  //     window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
  //   }
  // }, [latexExpression]);

  useEffect(() => {
    if (result) {
      setPendingResult(result);
      setIsPlacingResult(true);
    }
  }, [result]);

  const renderLatexToCanvas = (expression: string, answer: string, top: number, left: number) => {
    const latex = `\\(\\LARGE{\\text{${expression}} = ${answer}}\\)`;
    // Assign a unique id and specified position
    setLatexBlocks((prev) => [
      ...prev,
      {
        id: `latex-${Date.now()}-${Math.random()}`,
        latex,
        top,
        left,
      },
    ]);
    // Remove canvas clearing - keep drawings intact
  };

  // Handle canvas click for placing results
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPlacingResult && pendingResult) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      renderLatexToCanvas(pendingResult.expression, pendingResult.answer, y, x);
      
      // Clear pending result and exit placement mode
      setPendingResult(null);
      setIsPlacingResult(false);
      setResult(undefined);
    }
  }, [isPlacingResult, pendingResult]);

  useEffect(() => {
    if (reset) {
      const canvas = drawCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      setLatexBlocks([]); // Clear LaTeX results
      setReset(false);
    }
  }, [reset]);

  const sendData = async () => {
    const canvas = drawCanvasRef.current;
    if (canvas) {
      try {
        const response = await axios.post(`${import.meta.env.VITE_API_URL}/calculate`, {
          image: canvas.toDataURL("image/png"),
          dict_of_vars: dictofVars,
        });
        const res = response.data?.data?.[0];
        if (res) setResult({ expression: res.expr, answer: res.result });
      } catch (err) {
        console.error("Error sending data:", err);
      }
    }
  };

  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // Don't start drawing if we're placing a result
    if (isPlacingResult) return;
    
    const canvas = drawCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.beginPath();
      ctx?.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
      setIsDrawing(true);
    }
  }, [isPlacingResult]);

  const stopDrawing = useCallback(() => setIsDrawing(false), []);

  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;
      const canvas = drawCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.lineWidth = isErasing ? eraserSize : 3;
          ctx.strokeStyle = isErasing ? "rgba(0,0,0,1)" : color;
          ctx.globalCompositeOperation = isErasing ? "destination-out" : "source-over";
          ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
          ctx.stroke();
        }
      }
    },
    [isDrawing, isErasing, eraserSize, color]
  );

  // DnD sensors for better drag experience
  const sensors = useSensors(useSensor(PointerSensor));

  // Handle drag end to update position
  const handleDragEnd = (event: any) => {
    const { active, delta } = event;
    setLatexBlocks((blocks) =>
      blocks.map((block) => {
        if (block.id === active.id) {
          return {
            ...block,
            top: block.top + delta.y,
            left: block.left + delta.x,
          };
        }
        return block;
      })
    );
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 p-4 items-center justify-center">
        <Button onClick={() => setReset(true)} className="z-20 bg-slate-600 text-white">Reset</Button>
        <Button onClick={() => setIsErasing(!isErasing)} className="z-20 bg-slate-600 text-white">
          {isErasing ? "Use Pen" : "Use Eraser"}
        </Button>
        {isErasing && (
          <input
            type="range"
            min="5"
            max="50"
            value={eraserSize}
            onChange={(e) => setEraserSize(Number(e.target.value))}
            className="z-20 cursor-pointer"
          />
        )}
        <Group className="z-20 flex flex-wrap space-x-2 p-2 rounded-lg bg-slate-600/80">
          {SWATCHES.map((swatchcolor) => (
            <ColorSwatch
              key={swatchcolor}
              color={swatchcolor}
              onClick={() => setColor(swatchcolor)}
              className="cursor-pointer hover:scale-110 border border-gray-700 rounded-full"
            />
          ))}
        </Group>
        <Button 
          onClick={sendData} 
          className={`z-20 ${isPlacingResult ? 'bg-green-600' : 'bg-slate-600'} text-white`}
          disabled={isPlacingResult}
        >
          {isPlacingResult ? 'Click to Place Result' : 'Calculate'}
        </Button>
        {isPlacingResult && (
          <Button 
            onClick={() => {
              setPendingResult(null);
              setIsPlacingResult(false);
              setResult(undefined);
            }} 
            className="z-20 bg-red-600 text-white"
          >
            Cancel
          </Button>
        )}
      </div>

      {/* Show placement instruction */}
      {isPlacingResult && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
          Click anywhere on the canvas to place the result
        </div>
      )}

      <canvas ref={bgCanvasRef} className="absolute top-0 left-0 w-full h-full z-0" />
      <canvas
        ref={drawCanvasRef}
        className={`absolute top-0 left-0 w-full h-full z-10 ${isPlacingResult ? 'cursor-crosshair' : ''}`}
        onMouseDown={startDrawing}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
        onMouseMove={draw}
        onClick={handleCanvasClick}
      />

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        {latexBlocks.map((block) => (
          <DraggableLatex key={block.id} id={block.id} latex={block.latex} top={block.top} left={block.left} />
        ))}
      </DndContext>
    </div>
  );
}
