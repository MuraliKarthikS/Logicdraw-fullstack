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
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState("rgb(255, 255, 255)");
    const [reset, setReset] = useState(false);
    const [result, setResult] = useState<GeneratedResult>();
    const [dictofVars, setDictofVars] = useState({});
    const [isErasing, setIsErasing] = useState(false);
    const [eraserSize, setEraserSize] = useState(20); // Dynamic Eraser Size

    // Resize canvas dynamically
    const resizeCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext("2d");
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            ctx!.fillStyle = "black";
            ctx!.fillRect(0, 0, canvas.width, canvas.height);
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

    const resetCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext("2d");
            ctx!.clearRect(0, 0, canvas.width, canvas.height);
            ctx!.fillStyle = "black";
            ctx!.fillRect(0, 0, canvas.width, canvas.height);
        }
    };

    const sendData = async () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/calculate`, {
                image: canvas.toDataURL("image/png"),
                dict_of_vars: dictofVars,
            });
            console.log("Response: ", response.data);
        }
    };

    const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
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
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext("2d");
            ctx!.globalCompositeOperation = "source-over";

            if (isErasing) {
                ctx!.strokeStyle = "black";
                ctx!.lineWidth = eraserSize;
            } else {
                ctx!.strokeStyle = color;
                ctx!.lineWidth = 3;
            }

            ctx!.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
            ctx!.stroke();
        }
    }, [isDrawing, isErasing, eraserSize, color]);

    return (
        <div>
            {/* Toolbar */}
            <div className="flex flex-wrap gap-2 p-4 items-center justify-center">
                <Button
                    onClick={() => setReset(true)}
                    className="z-20 bg-slate-600 text-white hover:bg-gray-800 transition-colors duration-200 rounded-md px-4 py-2"
                >
                    Reset
                </Button>

                <Button
                    onClick={() => setIsErasing(!isErasing)}
                    className="z-20 bg-slate-600 text-white hover:bg-gray-800 transition-colors duration-200 rounded-md px-4 py-2"
                >
                    {isErasing ? "Use Pen" : "Use Eraser"}
                </Button>

                {/* Eraser Size Adjuster */}
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

                <Button
                    onClick={sendData}
                    className="z-20 bg-slate-600 text-white hover:bg-gray-800 transition-colors duration-200 rounded-md px-4 py-2"
                >
                    Calculate
                </Button>
            </div>

            {/* Canvas */}
            <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full"
                onMouseDown={startDrawing}
                onMouseUp={stopDrawing}
                onMouseOut={stopDrawing}
                onMouseMove={draw}
            />
        </div>
    );
}
