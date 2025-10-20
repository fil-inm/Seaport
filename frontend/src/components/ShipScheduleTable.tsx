import React from "react";
import { Plus, Trash2, Ship } from "lucide-react";

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

            <button
                onClick={addShip}
                className="mt-4 flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            >
                <Plus size={18} />
                Добавить корабль
            </button>
        </div>
    );
};

export default ShipScheduleTable;