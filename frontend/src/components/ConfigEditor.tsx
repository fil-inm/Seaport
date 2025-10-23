import React, { useEffect, useState } from "react";
import { fetchConfig, saveConfig } from "../api/portApi";
import ShipScheduleTable from "./ShipScheduleTable";
import { Clock, Hammer, Gauge, Save, Loader2, CheckCircle2, AlertCircle
} from "lucide-react";

const ConfigEditor: React.FC = () => {
    const [config, setConfig] = useState<any | null>(null);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [savedMessage, setSavedMessage] = useState(false);

    useEffect(() => {
        // Добавим искусственную задержку для демонстрации загрузчика
        setLoading(true);
        setTimeout(() => {
            fetchConfig().then((data) => {
                setConfig(data);
                setLoading(false);
            });
        }, 500);
    }, []);

    const updateField = (field: string, value: any) => {
        setConfig((prev: any) => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (!canSave()) return;
        setSaving(true);
        await saveConfig(config);
        setSaving(false);
        setSavedMessage(true);
        setTimeout(() => setSavedMessage(false), 2500); // уведомление исчезнет через 2.5 с
    };

    const canSave = () => {
        if (!config?.schedule) return false;

        return config.schedule.every(
            (ship: any) =>
                ship.name.trim().length > 0 &&
                ship.arrival > 0 &&
                ship.weight > 0
        );
    };

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-screen text-gray-600">
                <Loader2 className="animate-spin text-blue-500 w-10 h-10 mb-3" />
                <p className="text-lg">Загрузка настроек...</p>
            </div>
        );
    }

    if (!config) {
        return (
            <div className="flex justify-center items-center h-screen text-gray-600 text-lg">
                Ошибка загрузки конфигурации 😞
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6 text-gray-800 relative">
            <div className="max-w-5xl mx-auto">
                <h1 className="text-3xl font-semibold flex items-center gap-3 mb-8">
                    <Gauge className="text-blue-500" />
                    Настройка параметров симуляции порта
                </h1>

                {/* --- Основные параметры --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Время */}
                    <div className="bg-white rounded-2xl shadow p-5">
                        <h3 className="flex items-center gap-2 text-lg font-semibold mb-3">
                            <Clock className="text-blue-500" /> Общая информация
                        </h3>
                        <label className="text-sm text-gray-600">Зерно случайных чисел</label>
                        <div className="flex items-center gap-2 mt-1 mb-3">
                            <input
                                type="number"
                                value={config.seed}
                                onChange={(e) =>
                                    updateField("seed", Number(e.target.value))
                                }
                                className="border rounded-md p-2 w-full"
                            />
                        </div>

                        <label className="text-sm text-gray-600">Шаг симуляции</label>
                        <div className="flex items-center gap-2 mt-1">
                            <input
                                type="number"
                                value={config.step}
                                onChange={(e) => updateField("step", Number(e.target.value))}
                                className="border rounded-md p-2 w-full"
                            />
                            <span className="text-gray-500 text-sm">мин</span>
                        </div>
                    </div>

                    {/* Краны */}
                    <div className="bg-white rounded-2xl shadow p-5">
                        <h3 className="flex items-center gap-2 text-lg font-semibold mb-3">
                            <Hammer className="text-blue-500" /> Количество кранов
                        </h3>
                        {[
                            { key: "Bulk", label: "Сыпучие грузы" },
                            { key: "Liquid", label: "Жидкие грузы" },
                            { key: "Container", label: "Контейнерные грузы" },
                        ].map((t) => (
                            <div
                                key={t.key}
                                className="flex items-center justify-between mb-2"
                            >
                                <span className="text-gray-700">{t.label}</span>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={config[`cranes${t.key}`]}
                                        onChange={(e) =>
                                            updateField(`cranes${t.key}`, Number(e.target.value))
                                        }
                                        className="border rounded-md p-1 w-20 text-center"
                                    />
                                    <span className="text-gray-500 text-sm">шт</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Скорости */}
                    <div className="bg-white rounded-2xl shadow p-5">
                        <h3 className="flex items-center gap-2 text-lg font-semibold mb-3">
                            <Gauge className="text-blue-500" /> Скорость разгрузки
                        </h3>
                        {[
                            { key: "Bulk", label: "Сыпучие грузы" },
                            { key: "Liquid", label: "Жидкие грузы" },
                            { key: "Container", label: "Контейнерные" },
                        ].map((t) => (
                            <div
                                key={t.key}
                                className="flex items-center justify-between mb-2"
                            >
                                <span className="text-gray-700">{t.label}</span>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        step="0.001"
                                        value={config[`rate${t.key}`]}
                                        onChange={(e) =>
                                            updateField(`rate${t.key}`, parseFloat(e.target.value))
                                        }
                                        className="border rounded-md p-1 w-24 text-center"
                                    />
                                    <span className="text-gray-500 text-sm">кг/мин</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* --- Таблица кораблей --- */}
                <ShipScheduleTable
                    ships={config.schedule || []}
                    onChange={(ships) => updateField("schedule", ships)}
                />

                {/* --- Кнопка сохранения --- */}
                <div className="mt-8 text-right relative">
                    <button
                        onClick={handleSave}
                        disabled={!canSave() || saving}
                        className={`flex items-center gap-2 ml-auto px-6 py-2 rounded-xl text-white font-medium shadow-md transition
            ${
                            !canSave()
                                ? "bg-gray-300 cursor-not-allowed"
                                : saving
                                    ? "bg-blue-300 cursor-wait"
                                    : "bg-blue-500 hover:bg-blue-600"
                        }`}
                    >
                        {saving ? (
                            <Loader2 className="animate-spin" size={18} />
                        ) : (
                            <Save size={18} />
                        )}
                        {saving ? "Сохранение..." : "Сохранить настройки"}
                    </button>

                    {!canSave() && (
                        <p className="flex items-center gap-2 text-sm text-red-500 mt-2 ml-auto w-fit">
                            <AlertCircle size={18} />
                            Все корабли должны иметь название, время прибытия и вес больше нуля.
                        </p>
                    )}
                </div>
            </div>

            {/* --- Сообщение о сохранении --- */}
            {savedMessage && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-md flex items-center gap-2 animate-fade-in">
                    <CheckCircle2 size={18} />
                    <span>Настройки успешно сохранены</span>
                </div>
            )}
        </div>
    );
};

export default ConfigEditor;