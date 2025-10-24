import {useState} from "react";
import ConfigEditor from "./components/ConfigEditor";
import PortSimulation from "./components/PortSimulation";
import {Settings, Anchor, Waves} from "lucide-react"; // ✅ заменили иконки

export default function App() {
    const [activeTab, setActiveTab] = useState<"config" | "simulation">("simulation");

    return (
        <div className="flex flex-col min-h-screen bg-gray-50 text-gray-800">
            {/* --- Верхняя панель --- */}
            <header className="bg-white shadow-sm p-4 flex items-center justify-between shrink-0">
                <h1 className="text-2xl font-semibold flex items-center gap-2">
                    <Anchor className="text-blue-500"/>
                    Симулятор порта
                </h1>

                {/* --- Навигация --- */}
                <nav className="flex gap-3">

                    <button
                        onClick={() => setActiveTab("simulation")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                            activeTab === "simulation"
                                ? "bg-blue-500 text-white shadow"
                                : "text-gray-600 hover:bg-gray-100"
                        }`}
                    >
                        <Waves size={18}/> {/* 🌊 Новый символ симуляции */}
                        Симуляция
                    </button>

                    <button
                        onClick={() => setActiveTab("config")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                            activeTab === "config"
                                ? "bg-blue-500 text-white shadow"
                                : "text-gray-600 hover:bg-gray-100"
                        }`}
                    >
                        <Settings size={18}/>
                        Настройки
                    </button>


                </nav>
            </header>

            {/* --- Контент --- */}
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-6xl mx-auto py-6 px-4">
                    {activeTab === "config" ? <ConfigEditor/> : <PortSimulation/>}
                </div>
            </main>


        </div>
    );
}