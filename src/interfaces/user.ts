import { TDepartmentColors, TDepartment } from './department';

export interface CreateUserDTO {
    studentId: string;
    displayName: string;
    userId: string;
}

export interface UpdateUserDTO {
    enableBot?: boolean;
    selectedDepartments?: TDepartment[];
    displayName?: string;
    selectedColors?: Record<TDepartment, TDepartmentColors>;
}

export interface IUser extends CreateUserDTO {
    enableBot: boolean;
    selectedDepartments: TDepartment[];
    superuser: boolean;
    authorized: boolean;
    selectedColors?: Record<TDepartment, TDepartmentColors>;
}
