// ✅ Changed file: now using TWO canvas layers
import { useEffect, useRef, useState, useCallback } from "react";
import { SWATCHES } from "@/constants";
import { ColorSwatch, Group } from "@mantine/core";
import { Button } from "@/components/ui/button";
import axios from "axios";

interface GeneratedResult {
    expression: string;
    answer: string;
}

export default function Home() {
    // ✅ Separate canvas refs for background and drawing layers
    const bgCanvasRef = useRef<HTMLCanvasElement>(null);
    const drawCanvasRef = useRef<HTMLCanvasElement>(null);

    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState("rgb(255, 255, 255)");
    const [reset, setReset] = useState(false);
    const [result, setResult] = useState<GeneratedResult>();
    const [dictofVars, setDictofVars] = useState({});
    const [isErasing, setIsErasing] = useState(false);
    const [eraserSize, setEraserSize] = useState(20);

    // ✅ Initialize and resize both canvases
    const resizeCanvas = useCallback(() => {
        const bgCanvas = bgCanvasRef.current;
        const drawCanvas = drawCanvasRef.current;

        if (bgCanvas && drawCanvas) {
            bgCanvas.width = window.innerWidth;
            bgCanvas.height = window.innerHeight;
            drawCanvas.width = window.innerWidth;
            drawCanvas.height = window.innerHeight;

            const bgCtx = bgCanvas.getContext("2d");
            bgCtx!.fillStyle = "black";
            bgCtx!.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
        }
    }, []);

    useEffect(() => {
        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);
        return () => window.removeEventListener("resize", resizeCanvas);
    }, [resizeCanvas]);

    useEffect(() => {
        if (reset) {
            resetCanvas();
            setReset(false);
        }
    }, [reset]);

    // ✅ Only clear the drawing canvas (not background)
    const resetCanvas = () => {
        const drawCanvas = drawCanvasRef.current;
        if (drawCanvas) {
            const ctx = drawCanvas.getContext("2d");
            ctx!.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
        }
    };

    const sendData = async () => {
        const drawCanvas = drawCanvasRef.current;
        if (drawCanvas) {
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/calculate`, {
                image: drawCanvas.toDataURL("image/png"),
                dict_of_vars: dictofVars,
            });
            console.log("Response: ", response.data);
        }
    };

    const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = drawCanvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext("2d");
            ctx!.beginPath();
            ctx!.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
            setIsDrawing(true);
        }
    }, []);

    const stopDrawing = useCallback(() => {
        setIsDrawing(false);
    }, []);

    const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const canvas = drawCanvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext("2d");
            ctx!.lineWidth = isErasing ? eraserSize : 3;
            ctx!.strokeStyle = isErasing ? "rgba(0,0,0,1)" : color;
            ctx!.globalCompositeOperation = isErasing ? "destination-out" : "source-over";
            ctx!.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
            ctx!.stroke();
        }
    }, [isDrawing, isErasing, eraserSize, color]);

    return (
        <div>
            {/* Toolbar */}
            <div className="flex flex-wrap gap-2 p-4 items-center justify-center">
                <Button onClick={() => setReset(true)} className="z-20 bg-slate-600 text-white hover:bg-gray-800 transition-colors duration-200 rounded-md px-4 py-2">
                    Reset
                </Button>
                <Button onClick={() => setIsErasing(!isErasing)} className="z-20 bg-slate-600 text-white hover:bg-gray-800 transition-colors duration-200 rounded-md px-4 py-2">
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
                    {SWATCHES.map((swatchcolor: string) => (
                        <ColorSwatch
                            key={swatchcolor}
                            color={swatchcolor}
                            onClick={() => setColor(swatchcolor)}
                            className="cursor-pointer transition-transform transform hover:scale-110 border border-gray-700 rounded-full"
                        />
                    ))}
                </Group>
                <Button onClick={sendData} className="z-20 bg-slate-600 text-white hover:bg-gray-800 transition-colors duration-200 rounded-md px-4 py-2">
                    Calculate
                </Button>
            </div>

            {/* ✅ Canvas Layers - background stays untouched */}
            <canvas ref={bgCanvasRef} className="absolute top-0 left-0 w-full h-full z-0" />
            <canvas
                ref={drawCanvasRef}
                className="absolute top-0 left-0 w-full h-full z-10"
                onMouseDown={startDrawing}
                onMouseUp={stopDrawing}
                onMouseOut={stopDrawing}
                onMouseMove={draw}
            />
        </div>
    );
}
