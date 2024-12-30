export const LarngearCampDepartment = {
    BOARD: 'BOARD',
    COOP: 'COOP',
    PLAN: 'PLAN',
    ACT: 'ACT',
    VCK: 'VCK',
    SECURITY: 'SECURITY',
    SUPPLY: 'SUPPLY',
    PLACE: 'PLACE',
    NURSE: 'NURSE',
    REG: 'REG',
    IT: 'IT',
    PR: 'PR',
    SPONSOR: 'SPONSOR',
    FINANCE: 'FINANCE',
    MC: 'MC',
};

export type TDepartment = keyof typeof LarngearCampDepartment;

// TODO: edit colors to match the design
export const DepartmentColors = {
    red: 'red',
    orange: 'orange',
    yellow: 'yellow',
    green: 'green',
    blue: 'blue',
    purple: 'purple',
    pink: 'pink',
    gray: 'gray',
};

export type TDepartmentColors = keyof typeof DepartmentColors;
