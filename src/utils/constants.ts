
export const EVALUATION_GROUPS = {
  'AK': {
    name: 'La Akademia',
    categories: ['Bienvenidos a KFC']
  },
  'A': {
    name: 'Básicos',
    categories: ['Introducción', 'SST', 'Seguridad de alimentos']
  },
  'B': {
    name: 'Star',
    categories: ['Equipos', 'Producción', 'Servicio', 'Ensamble', 'Domicilios', 'Heladería']
  },
  'C': {
    name: 'All-Star',
    categories: ['Equipos', 'Producción', 'Servicio', 'Ensamble', 'Domicilios', 'Heladería']
  },
  'D': {
    name: 'Plan de Capacitación y SST',
    categories: ['Guías Plan de Capacitación', 'Guías de SST']
  },
  'E': {
    name: 'The Vault',
    categories: ['Fundamentos básicos', 'FOH', 'BOH', 'MOH', 'Delivery']
  }
};

export const TOTAL_CATEGORIES_COUNT = Object.values(EVALUATION_GROUPS).reduce(
  (acc, group) => acc + group.categories.length, 0
);

export const APPROVAL_THRESHOLD = 90;

export const INITIAL_RESTAURANTS = [];
