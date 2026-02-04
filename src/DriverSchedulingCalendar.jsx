import React, { useState, useMemo, useEffect } from 'react';
import { Truck, Users, Settings, Save, RefreshCw, Trash2, ChevronDown, AlertCircle, Download, Upload } from 'lucide-react';

// --- Constants & Config ---
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

// Initial Drivers Data
const INITIAL_DRIVERS = [
  // 10 Contract Drivers (約聘 - Can rest any day)
  { id: 1, name: '約聘1(葉)', type: 'contract', carType: 'CROSS', carPlate: 'RAM-3075', defaultRole: 'fixed' },
  { id: 2, name: '約聘2(簡)', type: 'contract', carType: 'SIENTA', carPlate: 'RAM-3080', defaultRole: 'fixed' },
  { id: 3, name: '約聘3(鄭)', type: 'contract', carType: 'RAV4', carPlate: 'RAM-3501', defaultRole: 'fixed' },
  { id: 4, name: '約聘4(王)', type: 'contract', carType: 'RAV4', carPlate: 'RAM-3506', defaultRole: 'fixed' },
  { id: 5, name: '約聘5(王)', type: 'contract', carType: 'RAV4', carPlate: 'RAM-3507', defaultRole: 'fixed' },
  { id: 6, name: '約聘6(葉)', type: 'contract', carType: 'CROSS', carPlate: 'RAM-3510', defaultRole: 'fixed' },
  { id: 7, name: '約聘7(黃)', type: 'contract', carType: '現代9座', carPlate: 'RAM-3523', defaultRole: 'fixed' },
  { id: 8, name: '約聘8(王)', type: 'contract', carType: 'CROSS', carPlate: 'RAM-3553', defaultRole: 'fixed' },
  { id: 9, name: '約聘9(黃)', type: 'contract', carType: 'SIENTA', carPlate: 'RAM-3576', defaultRole: 'fixed' },
  { id: 10, name: '約聘10(范)', type: 'contract', carType: '現代9座', carPlate: 'RAM-3582', defaultRole: 'fixed' },
  // 5 Contractor Drivers (承攬 - Rest on Sat/Sun only)
  { id: 11, name: '承攬1(裴)', type: 'contractor', carType: 'RAV4', carPlate: 'RAM-3520', defaultRole: 'fixed' },
  { id: 12, name: '承攬2(林)', type: 'contractor', carType: 'CROSS', carPlate: 'RAM-3571', defaultRole: 'fixed' },
  { id: 13, name: '承攬3(陳)', type: 'contractor', carType: 'CROSS', carPlate: 'RAM-3572', defaultRole: 'mobile' },
  { id: 14, name: '承攬4(高)', type: 'contractor', carType: 'CROSS', carPlate: 'RAM-3575', defaultRole: 'mobile' },
  { id: 15, name: '承攬5(謝)', type: 'contractor', carType: 'CROSS', carPlate: 'RAM-3573', defaultRole: 'mobile' },
];

const STATUS = {
  WORK: 'work',
  OFF: 'off',
  MOBILE: 'mobile',
  SPECIAL: 'special'
};

const STORAGE_KEY = 'shift_scheduler_data_v1';

export default function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [drivers, setDrivers] = useState(INITIAL_DRIVERS);
  const [schedule, setSchedule] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [isAutoScheduling, setIsAutoScheduling] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const daysInMonth = getDaysInMonth(currentDate);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Load from LocalStorage on Mount
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
        try {
            const parsed = JSON.parse(savedData);
            if (parsed.drivers) setDrivers(parsed.drivers);
            if (parsed.schedule) setSchedule(parsed.schedule);
            setLastSaved(new Date());
        } catch (e) {
            console.error("Failed to load data", e);
        }
    }
  }, []);

  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const dayOfWeek = date.getDay(); 
      days.push({
        date: i,
        dayOfWeek,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        fullDate: `${year}-${month + 1}-${i}`
      });
    }
    return days;
  }, [year, month, daysInMonth]);

  const totalHolidaysInMonth = calendarDays.filter(d => d.isWeekend).length;

  // --- Handlers ---
  const handleCellClick = (driverId, fullDate) => {
    const key = `${driverId}_${fullDate}`;
    const currentStatus = schedule[key] || STATUS.WORK;
    let nextStatus = STATUS.OFF;
    if (currentStatus === STATUS.OFF) nextStatus = STATUS.MOBILE;
    else if (currentStatus === STATUS.MOBILE) nextStatus = STATUS.SPECIAL;
    else if (currentStatus === STATUS.SPECIAL) nextStatus = STATUS.WORK;
    else nextStatus = STATUS.OFF;

    setSchedule(prev => {
        const newSchedule = { ...prev };
        if (nextStatus === STATUS.WORK) delete newSchedule[key];
        else newSchedule[key] = nextStatus;
        return newSchedule;
    });
  };

  const handleDriverUpdate = (id, field, value) => {
    setDrivers(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const changeMonth = (delta) => {
    const newDate = new Date(currentDate.setMonth(currentDate.getMonth() + delta));
    setCurrentDate(new Date(newDate));
  };

  const clearSchedule = () => {
    if (confirm('確定要清空本月班表嗎？')) setSchedule({});
  };

  const saveData = () => {
      const dataToSave = { drivers, schedule };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      setLastSaved(new Date());
      alert('資料已儲存至瀏覽器！');
  };

  // --- Auto Schedule Logic ---
  const autoSchedule = () => {
    setIsAutoScheduling(true);
    setTimeout(() => {
        const newSchedule = { ...schedule }; 
        
        const driverState = drivers.map(d => ({
            id: d.id,
            type: d.type,
            defaultRole: d.defaultRole,
            consecutiveWork: 0,
            consecutiveMobile: 0, // 新增：紀錄連續機動天數
            totalOff: 0
        }));

        calendarDays.forEach(day => {
            // 清除當前日期的舊排班
            drivers.forEach(d => {
                delete newSchedule[`${d.id}_${day.fullDate}`];
            });

            const isWeekend = day.isWeekend;
            const targetOff = isWeekend ? 8 : 3;
            const targetMobile = isWeekend ? 0 : 1;

            // 1. 判斷強制休假與限制
            const mustRestIds = [];
            const cannotRestIds = [];

            driverState.forEach(d => {
                // 規則：連上超過6天強制休假
                if (d.consecutiveWork >= 6) mustRestIds.push(d.id);
                // 規則：承攬人員平日不可休假
                if (d.type === 'contractor' && !isWeekend) cannotRestIds.push(d.id);
            });

            // 2. 挑選休假人員
            let selectedOff = [...mustRestIds];
            let candidatesForOff = driverState.filter(d => 
                !mustRestIds.includes(d.id) && 
                !cannotRestIds.includes(d.id)
            );

            // 依據累計休假數平衡
            candidatesForOff.sort((a, b) => a.totalOff - b.totalOff);

            let neededOff = targetOff - selectedOff.length;
            if (neededOff > 0) {
                const toAdd = candidatesForOff.slice(0, neededOff);
                selectedOff = [...selectedOff, ...toAdd.map(d => d.id)];
            }

            selectedOff.forEach(id => {
                newSchedule[`${id}_${day.fullDate}`] = STATUS.OFF;
                const drv = driverState.find(d => d.id === id);
                if (drv) {
                    drv.consecutiveWork = 0;
                    drv.consecutiveMobile = 0; // 休假時歸零機動計數
                    drv.totalOff++;
                }
            });

            // 3. 挑選機動人員 (新邏輯：連5換人)
            const workingDrivers = driverState.filter(d => !selectedOff.includes(d.id));
            let selectedMobileIds = [];

            if (targetMobile > 0) {
                // 篩選可以擔任機動的人：沒休假 且 連續機動天數未達5天
                const mobileEligible = workingDrivers.filter(d => d.consecutiveMobile < 5);
                
                // 優先順序：預設角色是 mobile 的先出，再來是 fixed，最後是看誰機動次數少
                mobileEligible.sort((a, b) => {
                    if (a.defaultRole === 'mobile' && b.defaultRole !== 'mobile') return -1;
                    if (a.defaultRole !== 'mobile' && b.defaultRole === 'mobile') return 1;
                    return a.consecutiveMobile - b.consecutiveMobile;
                });

                if (mobileEligible.length > 0) {
                    selectedMobileIds = mobileEligible.slice(0, targetMobile).map(d => d.id);
                }
            }

            // 更新狀態與寫入班表
            workingDrivers.forEach(d => {
                if (selectedMobileIds.includes(d.id)) {
                    newSchedule[`${d.id}_${day.fullDate}`] = STATUS.MOBILE;
                    d.consecutiveMobile++; // 增加機動計數
                } else {
                    d.consecutiveMobile = 0; // 今日非機動，計數歸零
                }
                d.consecutiveWork++; // 工作日增加連勤計數
            });
        });

        setSchedule(newSchedule);
        setIsAutoScheduling(false);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ drivers, schedule: newSchedule }));
        setLastSaved(new Date());
    }, 500);
  };

  // --- Render Helpers ---
  const getCellContent = (status) => {
    switch (status) {
      case STATUS.OFF: return <span className="text-red-600 font-bold text-lg">✕</span>;
      case STATUS.MOBILE: return <span className="text-blue-600 font-bold text-xl">◇</span>;
      case STATUS.SPECIAL: return <span className="text-purple-600 font-bold">特</span>;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-sm">
      {/* Header */}
      <header className="bg-slate-800 text-white p-4 shadow-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Truck className="h-6 w-6 text-yellow-400" />
            <div>
                <h1 className="text-xl font-bold tracking-wide">車隊排班管理系統</h1>
                {lastSaved && <span className="text-xs text-gray-400 block">上次儲存: {lastSaved.toLocaleTimeString()}</span>}
            </div>
          </div>
          
          <div className="flex items-center gap-4 bg-slate-700 rounded-lg p-1">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-600 rounded"><ChevronDown className="rotate-90" /></button>
            <span className="text-lg font-mono font-bold min-w-[120px] text-center">
              {year}年 {String(month + 1).padStart(2, '0')}月
            </span>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-600 rounded"><ChevronDown className="-rotate-90" /></button>
          </div>

          <div className="flex gap-2">
             <button 
                onClick={autoSchedule}
                disabled={isAutoScheduling}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-500 disabled:bg-green-800 rounded text-sm font-bold transition shadow-lg border border-green-400"
            >
                {isAutoScheduling ? <RefreshCw className="animate-spin" size={16}/> : <RefreshCw size={16} />}
                一鍵排班
            </button>
            <button 
                onClick={saveData}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-bold transition shadow-lg"
                title="儲存資料"
            >
                <Save size={16} /> 儲存
            </button>
            <button 
                onClick={clearSchedule}
                className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-500 rounded text-sm transition"
                title="清空本月"
            >
                <Trash2 size={16} />
            </button>
            <button 
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-2 px-3 py-2 bg-slate-600 hover:bg-slate-500 rounded text-sm transition"
                title="設定"
            >
                <Settings size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white border-b border-gray-200 p-6 shadow-inner animate-in slide-in-from-top-4">
            <div className="max-w-7xl mx-auto">
                <h3 className="font-bold text-lg mb-4 text-gray-700 flex items-center gap-2"><Users size={20}/> 編輯人員與車輛資料</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {drivers.map(driver => (
                        <div key={driver.id} className={`p-3 rounded border ${driver.type === 'contract' ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
                            <div className="flex justify-between mb-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${driver.type === 'contract' ? 'bg-blue-200 text-blue-800' : 'bg-orange-200 text-orange-800'}`}>
                                    {driver.type === 'contract' ? '約聘' : '承攬'}
                                </span>
                                <span className="text-xs text-gray-500">角色: {driver.defaultRole === 'mobile' ? '機動' : '固定'}</span>
                            </div>
                            <div className="space-y-2">
                                <input 
                                    value={driver.name} 
                                    onChange={(e) => handleDriverUpdate(driver.id, 'name', e.target.value)}
                                    className="w-full border rounded px-2 py-1 text-sm font-bold"
                                />
                                <div className="flex gap-2">
                                    <input 
                                        value={driver.carType} 
                                        onChange={(e) => handleDriverUpdate(driver.id, 'carType', e.target.value)}
                                        className="w-1/3 border rounded px-2 py-1 text-xs"
                                    />
                                    <input 
                                        value={driver.carPlate} 
                                        onChange={(e) => handleDriverUpdate(driver.id, 'carPlate', e.target.value)}
                                        className="w-2/3 border rounded px-2 py-1 text-xs font-mono"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto p-4">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden border border-gray-300 inline-block min-w-full">
            
            {/* Legend & Stats */}
            <div className="p-4 bg-gray-50 border-b flex flex-wrap gap-6 text-sm items-center">
                 <div className="flex items-center gap-2">
                    <span className="w-6 h-6 border flex items-center justify-center bg-white font-bold text-red-600">✕</span>
                    <span>休假</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-6 h-6 border flex items-center justify-center bg-white font-bold text-blue-600">◇</span>
                    <span>機動代班</span>
                </div>
                <div className="w-px h-6 bg-gray-300 mx-2"></div>
                <div className="ml-auto text-gray-700 font-medium">
                    應休基準: <span className="text-xl font-bold text-blue-600">{totalHolidaysInMonth}</span> 天
                </div>
            </div>

            {/* The Grid Table */}
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-center table-fixed" style={{minWidth: `${300 + (daysInMonth * 35)}px`}}>
                    <thead>
                        <tr className="bg-gray-100 text-gray-700 h-10">
                            <th className="w-[80px] border p-1 sticky left-0 bg-gray-100 z-10">職稱</th>
                            <th className="w-[80px] border p-1 sticky left-[80px] bg-gray-100 z-10">姓名</th>
                            <th className="w-[80px] border p-1 sticky left-[160px] bg-gray-100 z-10">車型</th>
                            <th className="w-[90px] border p-1 sticky left-[240px] bg-gray-100 z-10 border-r-2 border-r-gray-400">車號</th>
                            {calendarDays.map(day => (
                                <th key={day.date} className={`border w-[35px] text-sm ${day.isWeekend ? 'bg-yellow-100 text-red-600' : ''}`}>
                                    {day.date}
                                </th>
                            ))}
                            <th className="w-[60px] border p-1 bg-gray-200">排休</th>
                            <th className="w-[60px] border p-1 bg-gray-200">欠休</th>
                        </tr>
                        <tr className="bg-gray-200 text-gray-600 h-8 text-xs">
                            <th className="border sticky left-0 bg-gray-200 z-10" colSpan={4}>星期</th>
                            {calendarDays.map(day => (
                                <th key={day.date} className={`border ${day.isWeekend ? 'bg-yellow-200 text-red-700 font-bold' : ''}`}>
                                    {WEEKDAYS[day.dayOfWeek]}
                                </th>
                            ))}
                            <th colSpan={2} className="bg-gray-300 border"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {drivers.map((driver) => {
                             // Check consecutive works logic
                            let consecutive = 0;
                            const fatigueAlerts = new Set();
                            calendarDays.forEach(day => {
                                const status = schedule[`${driver.id}_${day.fullDate}`];
                                const isRest = status === STATUS.OFF || status === STATUS.SPECIAL;
                                if (!isRest) consecutive++; else consecutive = 0;
                                if (consecutive > 6) fatigueAlerts.add(day.fullDate);
                            });

                            let daysOffCount = 0;
                            calendarDays.forEach(d => {
                                const s = schedule[`${driver.id}_${d.fullDate}`];
                                if (s === STATUS.OFF || s === STATUS.SPECIAL) daysOffCount++;
                            });
                            const isContractor = driver.type === 'contractor';
                            const rowBg = isContractor ? 'bg-orange-50' : 'bg-white';
                            const balance = daysOffCount - totalHolidaysInMonth;
                            
                            return (
                                <tr key={driver.id} className={`h-10 hover:bg-blue-50 transition-colors ${rowBg}`}>
                                    <td className="border p-1 text-xs text-gray-500 sticky left-0 bg-inherit z-10">
                                        {isContractor ? '承攬' : '約聘'}
                                    </td>
                                    <td className="border p-1 font-bold text-gray-800 sticky left-[80px] bg-inherit z-10">
                                        {driver.name}
                                    </td>
                                    <td className="border p-1 text-xs text-gray-600 sticky left-[160px] bg-inherit z-10">
                                        {driver.carType}
                                    </td>
                                    <td className="border p-1 text-xs font-mono text-gray-600 sticky left-[240px] bg-inherit z-10 border-r-2 border-r-gray-400">
                                        {driver.carPlate}
                                    </td>
                                    
                                    {calendarDays.map(day => {
                                        const s = schedule[`${driver.id}_${day.fullDate}`];
                                        const isFatigue = fatigueAlerts.has(day.fullDate);
                                        const isContractorWeekdayRest = isContractor && !day.isWeekend && (s === STATUS.OFF || s === STATUS.SPECIAL);

                                        return (
                                            <td 
                                                key={day.date} 
                                                onClick={() => handleCellClick(driver.id, day.fullDate)}
                                                className={`
                                                    border cursor-pointer select-none transition-all
                                                    ${day.isWeekend ? 'bg-yellow-50' : ''}
                                                    ${isFatigue ? 'bg-red-100 ring-2 ring-inset ring-red-500' : ''}
                                                    ${isContractorWeekdayRest ? 'ring-2 ring-inset ring-orange-300' : ''}
                                                `}
                                            >
                                                {getCellContent(s)}
                                            </td>
                                        );
                                    })}
                                    <td className={`border font-bold ${daysOffCount < totalHolidaysInMonth ? 'text-red-600' : 'text-green-600'}`}>
                                        {daysOffCount}
                                    </td>
                                    <td className={`border font-bold ${balance < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                        {balance > 0 ? `+${balance}` : balance}
                                    </td>
                                </tr>
                            );
                        })}
                        
                        {/* Summary Rows */}
                        <tr className="border-t-4 border-gray-400 h-10 bg-gray-50 text-xs">
                            <td colSpan={4} className="border text-right font-bold pr-4 sticky left-0 bg-gray-50 z-10">
                                休假總人數 (Off)
                            </td>
                            {calendarDays.map(day => {
                                const count = drivers.filter(d => {
                                    const s = schedule[`${d.id}_${day.fullDate}`];
                                    return s === STATUS.OFF || s === STATUS.SPECIAL;
                                }).length;
                                const target = day.isWeekend ? 8 : 3;
                                return (
                                    <td key={day.date} className={`border font-bold ${count !== target ? 'text-orange-500 bg-orange-100' : 'text-green-600'}`}>
                                        {count}
                                    </td>
                                );
                            })}
                            <td colSpan={2}></td>
                        </tr>
                        <tr className="h-10 bg-gray-50 text-xs">
                            <td colSpan={4} className="border text-right font-bold pr-4 sticky left-0 bg-gray-50 z-10">
                                機動代班數 (◇)
                            </td>
                            {calendarDays.map(day => {
                                const count = drivers.filter(d => schedule[`${d.id}_${day.fullDate}`] === STATUS.MOBILE).length;
                                const target = day.isWeekend ? 0 : 1;
                                return (
                                    <td key={day.date} className={`border font-bold ${count < target ? 'text-red-400 bg-red-50' : 'text-blue-600'}`}>
                                        {count}
                                    </td>
                                );
                            })}
                            <td colSpan={2}></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
      </main>
    </div>
  );
}