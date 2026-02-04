import React, { useState, useMemo, useEffect } from 'react';
import { Truck, Users, Settings, Save, RefreshCw, Trash2, ChevronDown, Calendar, Printer } from 'lucide-react';

// --- 常數設定 ---
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const INITIAL_DRIVERS = [
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
  { id: 11, name: '承攬1(裴)', type: 'contractor', carType: 'RAV4', carPlate: 'RAM-3520', defaultRole: 'fixed' },
  { id: 12, name: '承攬2(林)', type: 'contractor', carType: 'CROSS', carPlate: 'RAM-3571', defaultRole: 'fixed' },
  { id: 13, name: '承攬3(陳)', type: 'contractor', carType: 'CROSS', carPlate: 'RAM-3572', defaultRole: 'mobile' },
  { id: 14, name: '承攬4(高)', type: 'contractor', carType: 'CROSS', carPlate: 'RAM-3575', defaultRole: 'mobile' },
  { id: 15, name: '承攬5(謝)', type: 'contractor', carType: 'CROSS', carPlate: 'RAM-3573', defaultRole: 'mobile' },
];

const STATUS = { WORK: 'work', OFF: 'off', MOBILE: 'mobile', SPECIAL: 'special' };
const STORAGE_KEY = 'shift_scheduler_data_v1';

// 隨機打亂陣列的輔助函式
const shuffleArray = (array) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

export default function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [drivers, setDrivers] = useState(INITIAL_DRIVERS);
  const [schedule, setSchedule] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [isAutoScheduling, setIsAutoScheduling] = useState(false);

  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      const parsed = JSON.parse(savedData);
      if (parsed.drivers) setDrivers(parsed.drivers);
      if (parsed.schedule) setSchedule(parsed.schedule);
    }
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({
        date: i,
        dayOfWeek: date.getDay(),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        fullDate: `${year}-${month + 1}-${i}`
      });
    }
    return days;
  }, [year, month, daysInMonth]);

  const totalHolidaysInMonth = calendarDays.filter(d => d.isWeekend).length;

  const handleCellClick = (driverId, fullDate) => {
    const key = `${driverId}_${fullDate}`;
    const current = schedule[key] || STATUS.WORK;
    let next = STATUS.OFF;
    if (current === STATUS.OFF) next = STATUS.MOBILE;
    else if (current === STATUS.MOBILE) next = STATUS.SPECIAL;
    else if (current === STATUS.SPECIAL) next = STATUS.WORK;

    setSchedule(prev => {
      const updated = { ...prev };
      if (next === STATUS.WORK) delete updated[key];
      else updated[key] = next;
      return updated;
    });
  };

  const autoSchedule = () => {
    setIsAutoScheduling(true);
    setTimeout(() => {
      const newSchedule = {}; 
      const driverState = drivers.map(d => ({
        id: d.id,
        type: d.type,
        defaultRole: d.defaultRole,
        consecutiveWork: 0,
        consecutiveMobile: 0,
        totalOff: 0
      }));

      calendarDays.forEach(day => {
        const targetOff = day.isWeekend ? 8 : 3;
        const targetMobile = day.isWeekend ? 0 : 1;

        const mustRestIds = driverState.filter(d => d.consecutiveWork >= 6).map(d => d.id);
        const cannotRestIds = driverState.filter(d => d.type === 'contractor' && !day.isWeekend).map(d => d.id);

        let selectedOff = [...mustRestIds];
        let candidates = driverState.filter(d => !mustRestIds.includes(d.id) && !cannotRestIds.includes(d.id));
        candidates = shuffleArray(candidates);
        candidates.sort((a, b) => a.totalOff - b.totalOff);
        
        const needed = targetOff - selectedOff.length;
        if (needed > 0) {
          selectedOff = [...selectedOff, ...candidates.slice(0, Math.max(0, needed)).map(d => d.id)];
        }

        selectedOff.forEach(id => {
          newSchedule[`${id}_${day.fullDate}`] = STATUS.OFF;
          const d = driverState.find(x => x.id === id);
          d.consecutiveWork = 0;
          d.consecutiveMobile = 0;
          d.totalOff++;
        });

        const working = driverState.filter(d => !selectedOff.includes(d.id));
        let selectedMobileId = null;

        if (targetMobile > 0) {
          let mobileCandidates = working.filter(d => d.consecutiveMobile < 5);
          mobileCandidates = shuffleArray(mobileCandidates);

          mobileCandidates.sort((a, b) => {
             const aWeight = a.defaultRole === 'mobile' ? 0 : 1;
             const bWeight = b.defaultRole === 'mobile' ? 0 : 1;
             if (aWeight !== bWeight) return aWeight - bWeight;
             return a.consecutiveMobile - b.consecutiveMobile;
          });
          
          if (mobileCandidates.length > 0) selectedMobileId = mobileCandidates[0].id;
        }

        working.forEach(d => {
          if (d.id === selectedMobileId) {
            newSchedule[`${d.id}_${day.fullDate}`] = STATUS.MOBILE;
            d.consecutiveMobile++;
          } else {
            d.consecutiveMobile = 0;
          }
          d.consecutiveWork++;
        });
      });

      setSchedule(newSchedule);
      setIsAutoScheduling(false);
    }, 400);
  };

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ drivers, schedule }));
    alert('儲存成功！');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* 列印專用樣式 */}
      <style>{`
        @media print {
          header, button, .no-print {
            display: none !important;
          }
          body {
            background-color: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .max-w-screen-2xl {
            max-width: 100% !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .shadow-xl, .shadow-sm, .shadow-lg {
            box-shadow: none !important;
          }
          .rounded-2xl, .rounded-xl {
            border-radius: 0 !important;
          }
          table {
            border: 1px solid #333 !important;
            font-size: 10px !important;
          }
          th, td {
            border: 1px solid #ddd !important;
            padding: 4px 2px !important;
          }
          .sticky {
            position: static !important;
          }
          .bg-orange-50 {
            background-color: #fffaf0 !important;
            -webkit-print-color-adjust: exact;
          }
          .hidden-print {
            display: none !important;
          }
          .show-on-print {
            display: table-cell !important;
          }
          .print-title {
            display: block !important;
            text-align: center;
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 10px;
          }
        }
        @media screen {
          .print-title { display: none; }
        }
      `}</style>

      <header className="bg-slate-800 text-white p-4 sticky top-0 z-30 shadow-lg no-print">
        <div className="max-w-screen-2xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-500 p-2 rounded-lg">
              <Truck className="text-slate-900" size={24} />
            </div>
            <h1 className="text-2xl font-black tracking-tight">車隊排班系統</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="flex items-center gap-2 bg-slate-600 hover:bg-slate-500 px-4 py-2 rounded-lg font-bold transition shadow-md active:scale-95">
              <Printer size={18} /> 列印報表
            </button>
            <button onClick={autoSchedule} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg font-bold transition shadow-md active:scale-95">
              <RefreshCw size={18} className={isAutoScheduling ? 'animate-spin' : ''} /> 一鍵隨機排班
            </button>
            <button onClick={save} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg font-bold transition shadow-md active:scale-95">
              <Save size={18} /> 儲存
            </button>
            <button onClick={() => setShowSettings(!showSettings)} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition">
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-screen-2xl mx-auto">
        {/* 列印標題 */}
        <div className="print-title">{year}年 {month + 1}月 車隊排班表</div>

        <div className="flex items-center gap-4 mb-6 bg-white p-3 rounded-xl shadow-sm border border-slate-200 w-fit no-print">
          <button onClick={() => setCurrentDate(new Date(year, month - 1))} className="p-1 hover:bg-slate-100 rounded-full transition">
            <ChevronDown className="rotate-90" size={20} />
          </button>
          <span className="text-xl font-bold font-mono">{year}年 {month + 1}月</span>
          <button onClick={() => setCurrentDate(new Date(year, month + 1))} className="p-1 hover:bg-slate-100 rounded-full transition">
            <ChevronDown className="-rotate-90" size={20} />
          </button>
        </div>

        <div className="flex flex-wrap gap-6 mb-4 text-sm font-medium text-slate-600 bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print">
           <div className="flex items-center gap-2"><span className="w-3 h-3 bg-red-500 rounded-full"></span> ✕ 休假</div>
           <div className="flex items-center gap-2"><span className="w-3 h-3 bg-blue-500 rounded-full"></span> ◇ 機動</div>
           <div className="flex items-center gap-2"><span className="w-3 h-3 bg-purple-500 rounded-full"></span> 特 特休</div>
           <div className="ml-auto flex items-center gap-2">
             應休基準：<span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md font-bold text-base">{totalHolidaysInMonth}</span> 天
           </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-xs sm:text-sm">
                  <th className="p-3 sticky left-0 bg-slate-100 z-20 border-r w-20 text-left shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">姓名</th>
                  <th className="p-3 sticky left-20 bg-slate-100 z-20 border-r w-24 text-left shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">車型</th>
                  {/* 在列印時強制顯示車號 */}
                  <th className="p-3 sticky left-44 bg-slate-100 z-20 border-r w-28 text-left shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] hidden sm:table-cell show-on-print">車號</th>
                  
                  {calendarDays.map(d => (
                    <th key={d.date} className={`p-2 border-r min-w-[40px] ${d.isWeekend ? 'bg-orange-50 text-orange-700' : ''}`}>
                      <div className="text-[10px] uppercase opacity-60 no-print">{WEEKDAYS[d.dayOfWeek]}</div>
                      <div className="text-base font-bold">{d.date}</div>
                    </th>
                  ))}
                  <th className="p-3 bg-slate-200 w-16 sticky right-0 z-20 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] text-center">排休</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map(driver => {
                  let offCount = 0;
                  return (
                    <tr key={driver.id} className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors text-xs sm:text-sm">
                      <td className="p-3 font-bold sticky left-0 bg-white z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        {driver.name.split('(')[0]}
                      </td>
                      <td className="p-3 text-slate-600 font-medium sticky left-20 bg-white z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        {driver.carType}
                      </td>
                      <td className="p-3 font-mono text-slate-400 sticky left-44 bg-white z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] hidden sm:table-cell show-on-print">
                        {driver.carPlate}
                      </td>
                      {calendarDays.map(day => {
                        const s = schedule[`${driver.id}_${day.fullDate}`];
                        if (s === STATUS.OFF || s === STATUS.SPECIAL) offCount++;
                        return (
                          <td 
                            key={day.date} 
                            onClick={() => handleCellClick(driver.id, day.fullDate)}
                            className={`p-2 border-r text-center cursor-pointer select-none transition-all
                              ${day.isWeekend ? 'bg-orange-50/20' : ''}
                            `}
                          >
                            <div className="flex items-center justify-center min-h-[24px]">
                              {s === STATUS.OFF && <span className="text-red-500 font-bold text-xl leading-none">✕</span>}
                              {s === STATUS.MOBILE && <span className="text-blue-500 font-bold text-2xl leading-none">◇</span>}
                              {s === STATUS.SPECIAL && <span className="text-purple-500 font-bold text-lg leading-none font-mono">特</span>}
                            </div>
                          </td>
                        );
                      })}
                      <td className={`p-3 text-center font-bold sticky right-0 bg-white z-10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]
                        ${offCount < totalHolidaysInMonth ? 'text-red-500 bg-red-50' : 'text-emerald-600 bg-emerald-50'}`}>
                        {offCount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}