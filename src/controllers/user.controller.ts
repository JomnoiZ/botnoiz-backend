import {
    TDepartmentColors,
    LarngearCampDepartment,
    TDepartment,
    DepartmentColors,
} from '@/interfaces/department';
import { CreateUserDTO, UpdateUserDTO } from '@/interfaces/user';
import userService from '@/services/user.service';
import { Request, Response } from 'express';

function createDepartmentColors(
    defaultColor: TDepartmentColors
): Record<TDepartment, TDepartmentColors> {
    const departmentColors: Record<TDepartment, TDepartmentColors> = {
        BOARD: "default",
        PLAN: "blue",
        COOP: "yellow",
        ACT: "red",
        MC: "red",
        SUPPLY: "teal",
        PLACE: "orange",
        NURSE: "pink",
        REG: "orange",
        IT: "default",
        PR: "default",
        FINANCE: "default",
        VCK: "green",
        SECURITY: "pink",
        SPONSOR: "default"
    };

    const departments = Object.keys(LarngearCampDepartment) as TDepartment[];
    return departments.reduce((acc, department) => {
        acc[department] = departmentColors[department] || defaultColor;
        return acc;
    }, {} as Record<TDepartment, TDepartmentColors>);
}

async function createUser(req: Request, res: Response) {
    const { displayName, studentId, userId } = req.body as CreateUserDTO;

    const existedUser = await userService.findByStudentId(studentId);

    if (existedUser) {
        const updatedUser = await userService.updateByStudentId(
            existedUser.studentId,
            {
                displayName,
            }
        );
        return res.status(200).send({
            success: true,
            message: updatedUser
                ? 'Updated existed user successfully'
                : 'Updated existed user failed',
            data: updatedUser ? updatedUser : existedUser,
        });
    }

    const initColor = 'default';
    const selectedColors = createDepartmentColors(initColor);

    const createdUser = await userService.createUser({
        displayName,
        studentId,
        userId,
        enableBot: false,
        selectedDepartments: [],
        superuser: false,
        authorized: false,
        selectedColors,
    });

    if (!createdUser) {
        return res.status(400).send({
            success: false,
            message: 'Error creating user',
        });
    }

    return res.status(200).send({
        success: true,
        message: 'User created successfully',
        data: createdUser,
    });
}

async function getUsers(req: Request, res: Response) {
    const users = await userService.findAll();

    if (!users) {
        return res.status(400).send({
            success: false,
            message: 'Error fetching users',
        });
    }

    return res.status(200).send({
        success: true,
        message: 'Users fetched successfully',
        data: users,
    });
}

async function getUserByStudentIdOrUserId(req: Request, res: Response) {
    const { studentId_or_userId } = req.params;

    const isStudentId = /^6[5|6|7]3\d{5}21$/.test(studentId_or_userId);

    let user = null;

    if (isStudentId) {
        user = await userService.findByStudentId(studentId_or_userId);
    } else {
        user = await userService.findByUserId(studentId_or_userId);
    }

    if (!user) {
        return res.status(400).send({
            success: false,
            message: 'Error fetching user',
        });
    }

    return res.status(200).send({
        success: true,
        message: 'User fetched successfully',
        data: user,
    });
}

async function updateUser(req: Request, res: Response) {
    const { studentId_or_userId } = req.params;

    const updateBody = req.body as UpdateUserDTO;

    const isStudentId = /^6[5|6|7]3\d{5}21$/.test(studentId_or_userId);

    let updatedUser = null;

    if (isStudentId) {
        updatedUser = await userService.updateByStudentId(
            studentId_or_userId,
            updateBody
        );
    } else {
        updatedUser = await userService.updateByUserId(
            studentId_or_userId,
            updateBody
        );
    }

    if (!updatedUser) {
        return res.status(400).send({
            success: false,
            message: 'Error updating user',
        });
    }

    return res.status(200).send({
        success: true,
        message: 'User updated successfully',
        data: updatedUser,
    });
}

export default { createUser, getUsers, getUserByStudentIdOrUserId, updateUser };
