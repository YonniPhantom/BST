
export default function TabsNavigation({ activeTab, setActiveTab, disabled }: { activeTab: string, setActiveTab: (tab: string) => void, disabled: boolean }) {
    const tabs = [
        { id: "nuevo", label: "Nuevo Registro" },
        { id: "registro", label: "Registro Completo" },
        { id: "historial", label: "Historial Completo" },
        { id: "configuracion", label: "Configuración" },
    ];

    return (
        <div className="flex justify-center bg-gray-50 py-4 w-full ">
            <div className="flex items-center justify-center space-x-2 bg-gray-100 p-1 rounded-xl w-full">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        disabled={disabled}
                        className={`flex items-center justify-center px-6 w-1/4 py-2 rounded-lg font-medium transition-all ${activeTab === tab.id
                                ? "bg-white text-black shadow-sm"
                                : "text-gray-700 hover:bg-gray-200"
                            }`}
                    >
                        <span className="text-center">
                            {tab.label}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}