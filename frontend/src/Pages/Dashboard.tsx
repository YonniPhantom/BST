import Navbar from "../Components/Navbar";
import { motion } from "motion/react"
import Loading from "../Components/Loading";
import { useEffect, useState } from "react";
import Settings from "../Components/Tabs/Settings";
import ViewExcel from "../Components/Tabs/ViewExcel";
import { useSession } from "../contexts/AuthContext";
import { SaveProvider } from '../contexts/SaveContext';
import { ExcelCacheProvider } from '../contexts/ExcelCacheContext'
import { StudentsDataProvider } from '../contexts/StudentsDataContext'
import New from "../Components/Tabs/New"
import TabsNavigation from "../Components/TabsNavigation"
import History from '../Components/Tabs/History'

// Componente interno del dashboard
function DashboardContent({ activeTab, setActiveTab, disabled }: { 
  activeTab: string, 
  setActiveTab: (tab: string) => void, 
  disabled: boolean 
}) {

  return (
    <>
      <Navbar />
      <motion.div
        className="bg-[#F5F9FB] px-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <TabsNavigation activeTab={activeTab} setActiveTab={setActiveTab} disabled={disabled} />

        {activeTab === "nuevo" && <New />}
        {activeTab === "registro" && <ViewExcel />}
        {activeTab === "historial" && <History />}
        {activeTab === "configuracion" && <Settings />}
      </motion.div>
    </>
  )
}

export default function Dashboard() {
    const [loading, setLoading] = useState(true);
    const { data: session } = useSession();
    const [disabled, setDisabled] = useState(false);
    const [activeTab, setActiveTab] = useState("nuevo");

    useEffect(() => {
        checkSession();
    }, [session]);

    const checkSession = () => {
        if(!session) {
            setActiveTab("configuracion");
            setDisabled(true);
        } else {
            setDisabled(false);
        }
        setLoading(false);
    }

    if (loading) {
        return (
            <SaveProvider>
                <ExcelCacheProvider>
                    <StudentsDataProvider>
                        <Navbar />
                        <Loading />
                    </StudentsDataProvider>
                </ExcelCacheProvider>
            </SaveProvider>
        );
    }

    return (
        <SaveProvider>
            <ExcelCacheProvider>
                <StudentsDataProvider>
                    <DashboardContent 
                        activeTab={activeTab} 
                        setActiveTab={setActiveTab} 
                        disabled={disabled} 
                    />
                </StudentsDataProvider>
            </ExcelCacheProvider>
        </SaveProvider>
    )
}