import React, { useRef } from "react";
import { Plus, Trash2, Ship, Upload } from "lucide-react";

interface Ship {
    name: string;
    type: string;
    arrival: number;
    weight: number;
}

interface Props {
    ships: Ship[];
    onChange: (ships: Ship[]) => void;
}

const ShipScheduleTable: React.FC<Props> = ({ ships, onChange }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const updateShip = (index: number, field: keyof Ship, value: any) => {
        const updated = [...ships];
        (updated[index] as any)[field] = value;
        onChange(updated);
    };

    const addShip = () => {
        onChange([...ships, { name: "", type: "BULK", arrival: 0, weight: 0 }]);
    };

    const removeShip = (index: number) => {
        onChange(ships.filter((_, i) => i !== index));
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const data = JSON.parse(text);

                if (!Array.isArray(data)) {
                    alert("Файл должен содержать массив объектов кораблей.");
                    return;
                }

                const validShips = data.filter(
                    (s) =>
                        typeof s.name === "string" &&
                        typeof s.type === "string" &&
                        typeof s.arrival === "number" &&
                        typeof s.weight === "number"
                );

                if (validShips.length === 0) {
                    alert("Не найдено корректных записей кораблей.");
                    return;
                }

                onChange(validShips);

                alert(`Загружено ${validShips.length} кораблей из файла.`);
            } catch (err) {
                alert("Ошибка чтения файла: " + (err as Error).message);
            }
        };

        reader.readAsText(file);
        e.target.value = "";
    };
    const openFileDialog = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="bg-white rounded-2xl shadow p-5">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Ship className="text-blue-500" />
                Расписание кораблей
            </h3>

            <table className="w-full border-collapse">
                <thead className="bg-gray-100 text-sm text-gray-600">
                <tr>
                    <th className="p-2 text-left">Название</th>
                    <th className="p-2 text-left">Тип груза</th>
                    <th className="p-2 text-left">Прибытие (мин)</th>
                    <th className="p-2 text-left">Вес (кг)</th>
                    <th></th>
                </tr>
                </thead>
                <tbody>
                {ships.map((s, i) => (
                    <tr key={i} className="border-b last:border-none">
                        <td className="p-2">
                            <input
                                value={s.name}
                                onChange={(e) => updateShip(i, "name", e.target.value)}
                                className="border rounded-md p-1 w-full"
                            />
                        </td>
                        <td className="p-2">
                            <select
                                value={s.type}
                                onChange={(e) => updateShip(i, "type", e.target.value)}
                                className="border rounded-md p-1 w-full"
                            >
                                <option value="BULK">Сыпучий</option>
                                <option value="LIQUID">Жидкий</option>
                                <option value="CONTAINER">Контейнерный</option>
                            </select>
                        </td>
                        <td className="p-2">
                            <input
                                type="number"
                                value={s.arrival}
                                onChange={(e) =>
                                    updateShip(i, "arrival", Number(e.target.value))
                                }
                                className="border rounded-md p-1 w-full"
                            />
                        </td>
                        <td className="p-2">
                            <input
                                type="number"
                                value={s.weight}
                                onChange={(e) =>
                                    updateShip(i, "weight", Number(e.target.value))
                                }
                                className="border rounded-md p-1 w-full"
                            />
                        </td>
                        <td className="p-2 text-center">
                            <button
                                onClick={() => removeShip(i)}
                                className="text-red-500 hover:text-red-700"
                            >
                                <Trash2 size={18} />
                            </button>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>

            <div className="mt-4 flex flex-wrap items-center gap-4">
                <button
                    onClick={addShip}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                    <Plus size={18} />
                    Добавить корабль
                </button>

                <button
                    onClick={openFileDialog}
                    className="flex items-center gap-2 text-green-600 hover:text-green-700 font-medium"
                >
                    <Upload size={18} />
                    Загрузить из файла
                </button>

                <input
                    type="file"
                    accept=".json"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                />
            </div>
        </div>
    );
};

export default ShipScheduleTable;