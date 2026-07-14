import React from "react";
import { motion } from "framer-motion";
import { Users, Calendar, BarChart2, Zap, Check } from "lucide-react";

interface CardData {
  id: number;
  title: string;
  sub: string;
  icon: React.ReactNode;
  iconBg: string;
  positionClass: string;
  delay: number;
  duration: number;
}

const floatingCardsData: CardData[] = [
  {
    id: 1,
    title: "CRM Updated",
    sub: "32 new leads added",
    icon: <Users size={12} className="text-[#FF7A00]" />,
    iconBg: "rgba(255, 122, 0, 0.1)",
    positionClass: "top-[20%] left-[4%]",
    delay: 0.1,
    duration: 6,
  },
  {
    id: 2,
    title: "Meeting Summary",
    sub: "AI summary ready",
    icon: <Calendar size={12} className="text-[#A855F7]" />,
    iconBg: "rgba(168, 85, 247, 0.1)",
    positionClass: "top-[32%] right-[4%]",
    delay: 0.3,
    duration: 6.8,
  },
  {
    id: 3,
    title: "Analytics Report",
    sub: "Performance up 24%",
    icon: <BarChart2 size={12} className="text-[#22C55E]" />,
    iconBg: "rgba(34, 197, 94, 0.1)",
    positionClass: "bottom-[28%] left-[2%]",
    delay: 0.5,
    duration: 7.2,
  },
  {
    id: 4,
    title: "Automation",
    sub: "5 workflows executed",
    icon: <Zap size={12} className="text-[#EAB308]" />,
    iconBg: "rgba(234, 179, 8, 0.1)",
    positionClass: "bottom-[16%] right-[8%]",
    delay: 0.7,
    duration: 6.2,
  },
];

export const FloatingCards: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none z-10 hidden md:block">
      {floatingCardsData.map((card) => (
        <motion.div
          key={card.id}
          className={`hero-badge px-4 py-3 select-none flex items-center justify-between gap-6 card-glass ${card.positionClass}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: card.delay }}
        >
          <div className="flex items-center gap-3">
            {/* Left Icon */}
            <div 
              className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: card.iconBg }}
            >
              {card.icon}
            </div>

            {/* Texts */}
            <div className="flex flex-col items-start">
              <span 
                className="text-[12px] font-bold text-white tracking-wide"
                style={{ fontFamily: "'Satoshi', sans-serif" }}
              >
                {card.title}
              </span>
              <span 
                className="text-[10px] text-[#A7A7A7] mt-0.5"
                style={{ fontFamily: "'Satoshi', sans-serif" }}
              >
                {card.sub}
              </span>
            </div>
          </div>

          {/* Right Green Check Indicator */}
          <div className="w-4.5 h-4.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
            <Check size={9} className="text-emerald-400" strokeWidth={3} />
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default FloatingCards;
