import React, { useEffect, useState, useRef } from "react";
import {
    Play, RotateCcw, StepForward,
    Clock, DollarSign, Ship, Hammer, Droplets, Package, Scale, Loader, Waves, TextQuote, BookText, FileDown
} from "lucide-react";
import { getState, stepSimulation, resetSimulation } from "../api/portApi";
import { motion, AnimatePresence } from "framer-motion";

interface ShipData {
    name: string;
    type: string;
    arrival: number;
    actualArrival: number;
    weight: number;
    unloadTime: number;
    inQueue: boolean;
    unloading: boolean;
    finished: boolean;
    startUnload: number;
    finish: number;
    timeToArrival: number;
    timeToFinish: number;
    currentFine: number;
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
    const [log, setLog] = useState<string[]>([]);
    const [showPopup, setShowPopup] = useState(false);
    const [finalStats, setFinalStats] = useState<string | null>(null);

    // @ts-ignore
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const seenEvents = useRef<Set<string>>(new Set());

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
        setLog([]);
        setShowPopup(false);
        setFinalStats(null);
        seenEvents.current.clear();
    };

    const toggleRun = () => setRunning((prev) => !prev);

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

    const loggedEvents = useRef<Set<string>>(new Set());

    const updateWithEvent = (newState: PortState) => {
        const prev = state;
        setState(newState);
        if (!prev) return;

        const logOnce = (key: string, msg: string) => {
            if (!loggedEvents.current.has(key)) {
                loggedEvents.current.add(key);
                setLog(prev => [...prev, msg]);
            }
        };

        newState.ships.forEach((s) => {
            const prevShip = prev.ships.find(p => p.name === s.name);
            if (!prevShip) return;

            if (!prevShip.inQueue && s.inQueue && !s.unloading && !s.finished)
                logOnce(`${s.name}-arrived`,
                    `[${formatTime(newState.now)}] ${s.name} прибыл в порт`
                );

            if (!prevShip.unloading && s.unloading)
                logOnce(`${s.name}-start`,
                    `[${formatTime(newState.now)}] ${s.name} начал разгрузку`
                );

            if (!prevShip.finished && s.finished) {
                const wait = s.startUnload > 0 ? s.startUnload - s.actualArrival : 0;
                const unload = s.finish > 0 ? s.finish - s.startUnload : s.unloadTime;


                logOnce(`${s.name}-done`,
                    `[${formatTime(newState.now)}] ${s.name}: прибыл ${formatTime(s.actualArrival)}, ожидал ${formatTime(wait)}, разгрузка ${formatTime(unload)}`
                );
            }

        });

        const allDone = newState.ships.every(s => s.finished);
        if (allDone) {
            setRunning(false);
            if (intervalRef.current) clearInterval(intervalRef.current);

            const finished = newState.ships.filter(s => s.finished);
            const total = finished.length;
            const avgWait = finished.reduce((sum, s) => sum + (s.startUnload - s.actualArrival), 0) / total;
            const delays = finished.map(s => s.startUnload - s.arrival);
            const avgDelay = delays.reduce((a, b) => a + b, 0) / total;
            const maxDelay = Math.max(...delays);

            const summary = `Итоги:
Разгружено судов: ${total}
Среднее ожидание: ${avgWait.toFixed(1)} мин
Макс. задержка: ${maxDelay.toFixed(1)} мин
Средняя задержка: ${avgDelay.toFixed(1)} мин
Общий штраф: ${newState.fine.toFixed(1)} у.е.`;

            if (!loggedEvents.current.has("summary")) {
                loggedEvents.current.add("summary");
                setLog(prev => [...prev, summary]);
                setFinalStats(summary);

                console.log("📜 LOG at summary:", log);
                console.log("📊 FINAL STATS:", summary);

                setShowPopup(true);
            }
        }
    };
    if (!state) {
        return <div className="flex justify-center items-center h-screen text-gray-600 text-lg">
            Загрузка состояния порта...
        </div>;
    }

    const formatTime = (m: number) => {
        const d = Math.floor(m / 1440);
        const h = Math.floor((m % 1440) / 60);
        const min = m % 60;
        return `${d}д ${h}ч ${min}м`;
    };

    const cargoColor = (t: string) => ({
        BULK: "bg-yellow-100 border-yellow-400",
        LIQUID: "bg-blue-100 border-blue-400",
        CONTAINER: "bg-green-100 border-green-400",
    }[t] || "bg-gray-100 border-gray-300");

    const arriving = state.ships.filter(s => !s.inQueue && !s.unloading && !s.finished);
    const queueBulk = state.ships.filter(s => s.inQueue && s.type === "BULK");
    const queueLiquid = state.ships.filter(s => s.inQueue && s.type === "LIQUID");
    const queueContainer = state.ships.filter(s => s.inQueue && s.type === "CONTAINER");
    const unloading = state.ships.filter(s => s.unloading);

    return (
        <div className="relative min-h-screen bg-gray-50 text-gray-800 p-6">
            <div className="max-w-7xl mx-auto">

                {/* Заголовок */}
                <div className="flex items-center gap-3 mb-6">
                    <Waves className="text-blue-500" size={30}/>
                    <h1 className="text-3xl font-semibold">Симуляция работы морского порта</h1>
                </div>

                {/* Панель */}
                <div className="flex flex-wrap gap-3 mb-6">
                    <button onClick={toggleRun}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium shadow transition ${running ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"}`}>
                        <Play size={18}/> {running ? "Стоп" : "Старт"}
                    </button>

                    <button onClick={handleStep} disabled={running}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium shadow bg-blue-400 hover:bg-blue-500 disabled:bg-gray-300">
                        <StepForward size={18}/> Шаг
                    </button>

                    <button onClick={handleReset}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium shadow bg-gray-500 hover:bg-gray-600">
                        <RotateCcw size={18}/> Сброс
                    </button>

                    <div className="flex items-center gap-2 ml-auto">
                        <span className="text-gray-700 text-sm font-medium">Скорость:</span>
                        <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}
                                className="border rounded-lg px-3 py-1 text-sm">
                            {[1, 2, 5, 10, 15, 50, 100].map(v => <option key={v} value={v}>{v}x</option>)}
                        </select>
                    </div>
                </div>

                {/* Карточки */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-white p-5 rounded-2xl shadow flex items-center justify-between">
                        <Clock className="text-blue-500"/><span className="text-lg font-semibold">{formatTime(state.now)}</span>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow flex items-center justify-between">
                        <DollarSign className="text-green-500"/><span className="text-lg font-semibold text-red-600">{state.fine.toFixed(2)} у.е.</span>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow max-h-72 overflow-y-auto">
                        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                            <Package className="text-purple-600"/> Журнал разгрузок
                        </h3>
                        {log.length === 0 ? (
                            <p className="text-gray-400 text-sm italic">Пока нет событий...</p>
                        ) : (
                            <ul className="space-y-2 text-sm">
                                {log
                                    .filter(line => !line.includes("📊"))       // ❌ исключаем финальные итоги
                                    .slice(-2)                                 // ✅ показываем только последние 2
                                    .map((line, i) => (
                                        <li
                                            key={i}
                                            className="p-2 rounded-xl bg-gray-50 text-gray-800"
                                        >
                                            {line}
                                        </li>
                                    ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Основная визуализация */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* В пути */}
                    <div className="bg-white rounded-2xl p-4 shadow">
                        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                            <Ship className="text-blue-500"/> В пути
                        </h3>
                        <AnimatePresence>
                            {arriving.map((s) => (
                                <motion.div key={s.name} layout initial={{opacity: 0, y: 10}}
                                            animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: -10}}
                                            className={`border-2 rounded-xl p-3 mb-2 ${cargoColor(s.type)} shadow-sm`}>
                                    <div className="font-semibold">{s.name}</div>
                                    <div className="text-sm opacity-70">{s.type}</div>
                                    {s.timeToArrival > 0 && (
                                        <p className="text-xs text-gray-600 mt-1">Через {s.timeToArrival} мин</p>
                                    )}
                                </motion.div>
                            ))}
                            {arriving.length === 0 && <p className="text-gray-400 text-sm">—</p>}
                        </AnimatePresence>
                    </div>

                    {/* Очереди */}
                    <div className="bg-white rounded-2xl p-4 shadow col-span-2">
                        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                            <Hammer className="text-gray-700"/> Очереди по типам
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                            {[{label: "Сыпучие", data: queueBulk, icon: Scale},
                                {label: "Жидкие", data: queueLiquid, icon: Droplets},
                                {label: "Контейнерные", data: queueContainer, icon: Package}]
                                .map((q) => (
                                    <div key={q.label}>
                                        <div className="flex items-center gap-1 mb-2 text-gray-700 font-medium">
                                            <q.icon size={16}/>
                                            {q.label}
                                        </div>
                                        <div className="min-h-[100px]">
                                            <AnimatePresence>
                                                {q.data.map((s) => (
                                                    <motion.div key={s.name} layout initial={{opacity: 0, x: -10}}
                                                                animate={{opacity: 1, x: 0}}
                                                                exit={{opacity: 0, x: 10}}
                                                                className={`border rounded-xl p-2 mb-2 text-sm ${cargoColor(s.type)}`}>
                                                        <div>{s.name}</div>
                                                        {s.currentFine > 0 && (
                                                            <p className="text-xs text-gray-600 mt-1">
                                                                Штраф: {s.currentFine.toFixed(1)} у.е.
                                                            </p>
                                                        )}
                                                    </motion.div>
                                                ))}
                                                {q.data.length === 0 && <p className="text-gray-400 text-sm">—</p>}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>

                    {/* Доки */}
                    <div className="bg-white rounded-2xl p-4 shadow">
                        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                            <Loader className="text-green-600"/> Доки
                        </h3>
                        <AnimatePresence>
                            {state.cranes.map((c, i) => {
                                const sameTypeShips = unloading.filter(s => s.type === c.type);
                                const assigned = sameTypeShips[i - state.cranes.findIndex(cr => cr.type === c.type)] || null;

                                return (
                                    <motion.div key={i} layout
                                                className={`border-2 rounded-xl p-3 mb-2 ${assigned ? cargoColor(assigned.type) : "bg-gray-100 border-gray-300"}`}>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-semibold">Док {i + 1}</span>
                                            <span className="text-xs opacity-70">{c.type}</span>
                                        </div>
                                        {assigned ? (
                                            <>
                                                <p className="text-xs text-gray-700">Корабль: {assigned.name}</p>
                                                <p className="text-xs text-gray-700">
                                                    Вес: {assigned.weight.toLocaleString()} кг
                                                </p>
                                                {assigned.timeToFinish > 0 && (
                                                    <p className="text-xs text-gray-600 mt-1">
                                                        Осталось: {assigned.timeToFinish} мин
                                                    </p>
                                                )}
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

            {/* Popup */}
            <AnimatePresence>
                {showPopup && finalStats && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto text-center"
                        >
                            <h2 className="text-2xl font-semibold mb-4 text-lg flex items-center gap-2"><TextQuote /> Итоги моделирования</h2>


                            {/* --- Итоговая статистика --- */}
                            <pre className="text-left bg-gray-50 rounded-xl p-4 text-sm mb-6 whitespace-pre-wrap">
                    {finalStats}
                </pre>

                            {/* --- Полный лог симуляции --- */}
                            <div className="text-left bg-gray-50 rounded-xl p-4 text-sm mb-6 whitespace-pre-wrap max-h-64 overflow-y-auto">
                                <h3 className="flex items-center gap-2 text-2xl font-semibold text-lg mb-3 text-gray-800"><BookText /> Полный журнал событий</h3>
                                {log
                                    .map((line, i) => (
                                        <div
                                            key={i}
                                            className="border-b border-gray-200 py-1 text-gray-700 last:border-none"
                                        >
                                            {line}
                                        </div>
                                    ))}
                            </div>

                            {/* --- Кнопки --- */}
                            <div className="flex justify-center gap-3">
                                <button
                                    onClick={() => setShowPopup(false)}
                                    className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2 rounded-xl font-medium shadow"
                                >
                                    ОК
                                </button>
                                <button
                                    onClick={() => {
                                        const content = `=== Полный журнал ===\n${log.join(
                                            "\n"
                                        )}`;
                                        const blob = new Blob([content], { type: "text/plain" });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement("a");
                                        a.href = url;
                                        a.download = "port_simulation_log.txt";
                                        a.click();
                                        URL.revokeObjectURL(url);
                                    }}
                                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-5 py-2 rounded-xl font-medium shadow"
                                >

                                    <h3 className="flex items-center gap-2 text-2xl font-semibold text-lg text-gray-800"><FileDown /> Скачать лог</h3>


                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PortSimulation;