import React, { useEffect, useState, useRef } from "react";
import {
    Play, RotateCcw, StepForward,
    Clock, DollarSign, Ship, Hammer, Droplets, Package, Scale, Loader, Waves
} from "lucide-react";
import { getState, stepSimulation, resetSimulation } from "../api/portApi";
import { motion, AnimatePresence } from "framer-motion";

interface ShipData {
    name: string;
    type: string;
    arrival: number;
    actualArrival: number;
    weight: number;
    inQueue: boolean;
    unloading: boolean;
    finished: boolean;
}

interface Crane {
    type: string;
    busy: boolean;
    busyUntil: number;
}

interface PortState {
    now: number;
    fine: number;
    ships: ShipData[];
    cranes: Crane[];
    queueBulk: number;
    queueLiquid: number;
    queueContainer: number;
}

const PortSimulation: React.FC = () => {
    const [state, setState] = useState<PortState | null>(null);
    const [running, setRunning] = useState(false);
    const [speed, setSpeed] = useState(1);
    const [lastEvent, setLastEvent] = useState("Ожидание начала симуляции...");
    // @ts-ignore
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Загрузка первого состояния
    useEffect(() => {
        getState().then(setState);
    }, []);

    const handleStep = async () => {
        const newState = await stepSimulation();
        updateWithEvent(newState);
    };

    const handleReset = async () => {
        setRunning(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
        const resetState = await resetSimulation();
        setState(resetState);
        setLastEvent("🔄 Симуляция сброшена");
    };

    // --- управление симуляцией ---
    const toggleRun = () => {
        setRunning((prev) => !prev);
    };

// следим за состоянием симуляции и скорости
    useEffect(() => {
        if (running) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = setInterval(async () => {
                const newState = await stepSimulation();
                updateWithEvent(newState);
            }, 1000 / speed);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [running, speed]);

    const updateWithEvent = (newState: PortState) => {
        const prev = state;
        setState(newState);
        if (!prev) return;

        const arrived = newState.ships.find(s => s.inQueue && !prev.ships.find(p => p.name === s.name && p.inQueue));
        if (arrived) return setLastEvent(`🛳 ${arrived.name} прибыл`);

        const queued = newState.ships.find(s => s.inQueue && !prev.ships.find(p => p.name === s.name && !p.inQueue));
        if (queued) return setLastEvent(`⚓ ${queued.name} встал в очередь`);

        const unloadingNow = newState.ships.find(s => s.unloading && !prev.ships.find(p => p.name === s.name && p.unloading));
        if (unloadingNow) return setLastEvent(`🏗 ${unloadingNow.name} начал разгрузку`);

        const finished = newState.ships.find(s => s.finished && !prev.ships.find(p => p.name === s.name && p.finished));
        if (finished) return setLastEvent(`✅ ${finished.name} завершил разгрузку`);

        // 🏁 Все корабли обработаны
        const allDone = newState.ships.every(s => s.finished);
        if (allDone && running) {
            setRunning(false);
            setLastEvent("🌊 Все корабли обслужены. Симуляция завершена.");
        }
    };
    if (!state) {
        return (
            <div className="flex justify-center items-center h-screen text-gray-600 text-lg">
                Загрузка состояния порта...
            </div>
        );
    }

    // формат времени
    const formatTime = (minutes: number) => {
        const days = Math.floor(minutes / (24 * 60));
        const hours = Math.floor((minutes % (24 * 60)) / 60);
        const mins = minutes % 60;
        return `${days}д ${hours}ч ${mins}м`;
    };

    const cargoColor = (type: string) => {
        switch (type) {
            case "BULK": return "bg-yellow-100 border-yellow-400";
            case "LIQUID": return "bg-blue-100 border-blue-400";
            case "CONTAINER": return "bg-green-100 border-green-400";
            default: return "bg-gray-100 border-gray-300";
        }
    };

    const arriving = state.ships.filter(s => !s.inQueue && !s.unloading && !s.finished);
    const queueBulk = state.ships.filter(s => s.inQueue && s.type === "BULK");
    const queueLiquid = state.ships.filter(s => s.inQueue && s.type === "LIQUID");
    const queueContainer = state.ships.filter(s => s.inQueue && s.type === "CONTAINER");
    const unloading = state.ships.filter(s => s.unloading);

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 p-6">
            <div className="max-w-7xl mx-auto">
                {/* --- Заголовок --- */}
                <div className="flex items-center gap-3 mb-6">
                    <Waves className="text-blue-500" size={30} />
                    <h1 className="text-3xl font-semibold">Симуляция работы морского порта</h1>
                </div>

                {/* --- Панель управления --- */}
                <div className="flex flex-wrap gap-3 mb-6">
                    <button
                        onClick={toggleRun}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium shadow transition ${
                            running ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"
                        }`}
                    >
                        <Play size={18} />
                        {running ? "Стоп" : "Старт"}
                    </button>

                    <button
                        onClick={handleStep}
                        disabled={running}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium shadow bg-blue-400 hover:bg-blue-500 disabled:bg-gray-300"
                    >
                        <StepForward size={18} />
                        Шаг
                    </button>

                    <button
                        onClick={handleReset}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium shadow bg-gray-500 hover:bg-gray-600"
                    >
                        <RotateCcw size={18} />
                        Сброс
                    </button>

                    {/* Выбор скорости */}
                    <div className="flex items-center gap-2 ml-auto">
                        <span className="text-gray-700 text-sm font-medium">Скорость:</span>
                        <select
                            value={speed}
                            onChange={(e) => setSpeed(Number(e.target.value))}
                            className="border rounded-lg px-3 py-1 text-sm"
                        >
                            {[1,2,5,10, 15,50,100].map(v => (
                                <option key={v} value={v}>{v}x</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* --- Информационные карточки --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-white p-5 rounded-2xl shadow flex items-center justify-between">
                        <Clock className="text-blue-500" />
                        <span className="text-lg font-semibold">{formatTime(state.now)}</span>
                    </div>

                    <div className="bg-white p-5 rounded-2xl shadow flex items-center justify-between">
                        <DollarSign className="text-green-500" />
                        <span className="text-lg font-semibold text-red-600">{state.fine.toFixed(2)} у.е.</span>
                    </div>

                    {/* 🧭 События — карточка в стиле "время" */}
                    <div className="bg-white p-5 rounded-2xl shadow flex items-center justify-between">
                        {lastEvent.includes("прибыл") && <Ship className="text-blue-500" />}
                        {lastEvent.includes("очередь") && <Hammer className="text-yellow-500" />}
                        {lastEvent.includes("разгрузку") && <Loader className="text-green-500" />}
                        {lastEvent.includes("завершил") && <Package className="text-purple-500" />}
                        {lastEvent.includes("уплыл") && <Waves className="text-gray-400" />}
                        <span className="text-lg font-semibold text-gray-800">{lastEvent}</span>
                    </div>
                </div>

                {/* === Основной порт === */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* 1. В пути */}
                    <div className="bg-white rounded-2xl p-4 shadow">
                        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                            <Ship className="text-blue-500" /> В пути
                        </h3>
                        <AnimatePresence>
                            {arriving.map((s) => (
                                <motion.div
                                    key={s.name}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className={`border-2 rounded-xl p-3 mb-2 ${cargoColor(s.type)} shadow-sm`}
                                >
                                    <div className="font-semibold">{s.name}</div>
                                    <div className="text-sm opacity-70">{s.type}</div>
                                </motion.div>
                            ))}
                            {arriving.length === 0 && <p className="text-gray-400 text-sm">—</p>}
                        </AnimatePresence>
                    </div>

                    {/* 2. Очереди */}
                    <div className="bg-white rounded-2xl p-4 shadow col-span-2">
                        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                            <Hammer className="text-gray-700" /> Очереди по типам
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                            {[{label:"Сыпучие", data:queueBulk, icon:Scale},
                                {label:"Жидкие", data:queueLiquid, icon:Droplets},
                                {label:"Контейнерные", data:queueContainer, icon:Package}]
                                .map((q) => (
                                    <div key={q.label}>
                                        <div className="flex items-center gap-1 mb-2 text-gray-700 font-medium">
                                            <q.icon size={16}/> {q.label}
                                        </div>
                                        <div className="min-h-[100px]">
                                            <AnimatePresence>
                                                {q.data.map((s) => (
                                                    <motion.div
                                                        key={s.name}
                                                        layout
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: 10 }}
                                                        className={`border rounded-xl p-2 mb-2 text-sm ${cargoColor(s.type)}`}
                                                    >
                                                        {s.name}
                                                    </motion.div>
                                                ))}
                                                {q.data.length === 0 && <p className="text-gray-400 text-sm">—</p>}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>

                    {/* 3. Доки */}
                    <div className="bg-white rounded-2xl p-4 shadow">
                        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                            <Loader className="text-green-600" /> Доки
                        </h3>
                        <AnimatePresence>
                            {state.cranes.map((c, i) => {
                                const assigned = unloading.find(s => s.type === c.type && s.unloading);
                                return (
                                    <motion.div
                                        key={i}
                                        layout
                                        className={`border-2 rounded-xl p-3 mb-2 ${assigned ? cargoColor(assigned.type) : "bg-gray-100 border-gray-300"}`}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-semibold">Док {i + 1}</span>
                                            <span className="text-xs opacity-70">{c.type}</span>
                                        </div>
                                        {assigned ? (
                                            <>
                                                <p className="text-xs text-gray-700">Корабль: {assigned.name}</p>
                                                <p className="text-xs text-gray-700">Вес: {assigned.weight} кг</p>
                                            </>
                                        ) : (
                                            <p className="text-xs text-gray-400">Свободен</p>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PortSimulation;