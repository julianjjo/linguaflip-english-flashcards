import React from 'react';
import type { DashboardStats } from '../../stores/dashboard';

interface QuickActionsProps {
  dashboardStats?: DashboardStats | null;
}

const QuickActions: React.FC<QuickActionsProps> = () => {
  const actions = [
    {
      href: '/study',
      title: 'Continuar Estudiando',
      description: 'Revisa tus flashcards',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      color: 'primary',
      bgColor: 'bg-primary-50 hover:bg-primary-100 dark:bg-primary-900/20 dark:hover:bg-primary-900/30',
      iconBg: 'bg-primary-100 dark:bg-primary-900',
      iconColor: 'text-primary-600 dark:text-primary-400'
    },
    {
      href: '/data',
      title: 'Gestionar Datos',
      description: 'Importar/exportar tarjetas',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 12l2 2 4-4" />
        </svg>
      ),
      color: 'secondary',
      bgColor: 'bg-secondary-50 hover:bg-secondary-100 dark:bg-secondary-900/20 dark:hover:bg-secondary-900/30',
      iconBg: 'bg-secondary-100 dark:bg-secondary-900',
      iconColor: 'text-secondary-600 dark:text-secondary-400'
    },
    {
      href: '/settings',
      title: 'Configuración',
      description: 'Personalizar experiencia',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: 'accent',
      bgColor: 'bg-accent-50 hover:bg-accent-100 dark:bg-accent-900/20 dark:hover:bg-accent-900/30',
      iconBg: 'bg-accent-100 dark:bg-accent-900',
      iconColor: 'text-accent-600 dark:text-accent-400'
    }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-neutral-200 dark:border-gray-600">
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
        Acciones Rápidas
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {actions.map((action, index) => (
          <a
            key={index}
            href={action.href}
            className={`flex items-center gap-3 p-4 ${action.bgColor} rounded-lg transition-colors duration-200 group`}
          >
            <div className={`w-10 h-10 ${action.iconBg} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
              <div className={action.iconColor}>
                {action.icon}
              </div>
            </div>
            <div>
              <p className="font-medium text-neutral-900 dark:text-neutral-100">
                {action.title}
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {action.description}
              </p>
            </div>
          </a>
        ))}
      </div>

      {/* Additional quick stats */}
      <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-gray-600">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-xs text-neutral-600 dark:text-neutral-400 mb-1">
              Próxima revisión
            </div>
            <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              En 2 horas
            </div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-xs text-neutral-600 dark:text-neutral-400 mb-1">
              Tarjetas pendientes
            </div>
            <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              12 tarjetas
            </div>
          </div>
        </div>
      </div>
      
      {/* Call to action */}
      <div className="mt-4">
        <a
          href="/study"
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          Comenzar Sesión de Estudio
        </a>
      </div>
    </div>
  );
};

export default QuickActions;