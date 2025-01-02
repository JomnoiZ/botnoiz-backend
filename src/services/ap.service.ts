import moment from 'moment';
import { ISlot } from '@/interfaces/ap';
import ApModel from '@/models/ap.model';
import { TDepartment } from '@/interfaces/department';
import axios from 'axios';
import messageTemplate from '@/templates/message.template';
import flexTemplate from '@/templates/flex.template';
import messageUtil from '@/utils/message.util';
import userService from './user.service';
import { DepartmentColors } from '@/interfaces/department';
import { FlexBubble } from '@line/bot-sdk';

const create = async (body: ISlot) => {
    const createdSlot = await ApModel.create(body)
        .then((slot) => slot)
        .catch((e) => {
            console.log(e);
            return null;
        });

    return createdSlot as ISlot;
};

const findAll = async () => {
    const slots = await ApModel.find()
        .then((slot) => slot)
        .catch(() => null);

    if (!slots) {
        return null;
    }

    return slots
        .filter((slot) => slot.slot)
        .sort((a, b) => a.slot - b.slot) as ISlot[];
};

const findOneBySlot = async (slot: number) => {
    const slotData = await ApModel.findOne({
        slot,
    })
        .then((slot) => slot)
        .catch(() => null);

    return slotData as ISlot;
};

const findAnnouncedSlots = async () => {
    const slots = await ApModel.find({
        announced: true,
    })
        .then((slot) => slot)
        .catch(() => null);

    if (!slots) {
        return null;
    }

    return slots
        .filter((slot) => slot.slot)
        .sort((a, b) => a.slot - b.slot) as ISlot[];
};

const findUpcomingSlots = async () => {
    const slots = await ApModel.find({
        announced: false,
    })
        .then((slot) => slot)
        .catch(() => null);

    if (!slots) {
        return null;
    }

    return slots
        .filter((slot) => slot.slot)
        .sort((a, b) => a.slot - b.slot) as ISlot[];
};

const updateBySlot = async (
    slot: number,
    body: {
        slot?: number;
        start?: string;
        end?: string;
        duration?: string;
        department?: TDepartment;
        event?: string;
        location?: string;
        contact?: string;
        note?: string;
        announced?: boolean;
        totalOffset?: number;
    }
) => {
    console.log(slot,body)
    const updatedSlot = await ApModel.findOneAndUpdate(
        {
            slot,
        },
        body,
        {
            new: true,
        }
    )
        .then((slot) => slot)
        .catch(() => null);

    return updatedSlot as ISlot;
};

const getSheet = async (sheet: string) => {
    const slots: ISlot[] | null = await axios
        .get(process.env.AP_SHEET_API!, {
            params: {
                action: 'getSlots',
                sheet,
            },
        })
        .then((res) => {
            if (res.data.success) return res.data.data;

            return null;
        })
        .catch((err) => console.log(err));

    return slots;
};

const syncSheet = async (sheet: string) => {
    const slots = (await getSheet(sheet))?.filter((slot) => slot.slot);

    if (!slots) {
        return null;
    }

    const syncedSheet = slots.map(async (slot) => {
        const existedSlot = await findOneBySlot(slot.slot);

        const start = moment(moment(slot.start).format('HH:mm:ss'), 'HH:mm:ss')
            .utc()
            .format();
        const end = moment(moment(slot.end).format('HH:mm:ss'), 'HH:mm:ss')
            .utc()
            .format();

        slot.start = start;
        slot.end = end;

        if (!existedSlot) {
            const createdSlot = await create({ ...slot, announced: false, totalOffset: 0 });
            return createdSlot;
        }

        const updatedSlot = await updateBySlot(slot.slot, slot);

        return updatedSlot;
    });

    if (syncedSheet.length === 0) {
        return null;
    }

    return syncedSheet;
};

const findActiveSlots = async () => {
    const slots = (await findAll()) as ISlot[];

    if (!slots) {
        return null;
    }

    const activeSlots = slots.filter((slot) => {
        const currentTime = moment().utcOffset(7);
        const startTime = moment(
            moment(slot.start).format('HH:mm:ss'),
            'HH:mm:ss'
        ).utcOffset(7);
        const endTime = moment(
            moment(slot.end).format('HH:mm:ss'),
            'HH:mm:ss'
        ).utcOffset(7);
        if (endTime.isBefore(startTime)) endTime.add(1, 'day');
        const isBetween = currentTime.isBetween(startTime, endTime);
        const isSameAsStart =
            currentTime.format('HH:mm') === startTime.format('HH:mm');

        if (isBetween || isSameAsStart) return slot;
    });

    return activeSlots.sort((a, b) => a.slot - b.slot);
};

const announceSlots = async () => {
    const activeSlots = await findActiveSlots();

    if (!activeSlots) {
        return null;
    }

    const announcingSlots = [] as ISlot[];

    for (const slot of activeSlots) {
        if (!slot.announced) {
            slot.announced = true;

            const updatedSlot = await updateBySlot(slot.slot, slot);

            announcingSlots.push(updatedSlot);
        }
    }

    console.log(`${announcingSlots.length} slots have been announced`);

    return announcingSlots;
};

const multicastAnnounceSlots = async () => {
    const announcingSlots = await announceSlots();

    if (!announcingSlots) {
        return null;
    }

    // announcingSlots.forEach((slot) => {
    //     console.log(slot.slot, slot.event);
    // });

    const users = await userService.findAll();

    if (!users) {
        return null;
    }

    const userContents = {} as {
        [key: string]: { slot: number; slotColor: string }[];
    };

    for (const user of users) {
        for (const slot of announcingSlots) {
            if (
                user.selectedDepartments.includes(slot.department) &&
                user.enableBot
            ) {
                if (!userContents[user.userId as keyof typeof userContents]) {
                    Object.defineProperty(userContents, user.userId, {
                        value: [],
                        writable: true,
                        enumerable: true,
                        configurable: true,
                    });
                }

                userContents[user.userId as keyof typeof userContents].push({
                    slot: slot.slot,
                    slotColor: DepartmentColors[user.selectedColors[slot.department] as keyof typeof DepartmentColors],
                });
            }
        }
    }

    // const sampleUserContents = {
    //     user1: [
    //         { slot: 1, slotColor: 'red' },
    //         { slot: 2, slotColor: 'blue' },
    //     ],
    //     user2: [
    //         { slot: 1, slotColor: 'green' },
    //         { slot: 3, slotColor: 'yellow' },
    //     ],
    //     user3: [
    //         { slot: 2, slotColor: 'purple' },
    //         { slot: 3, slotColor: 'orange' },
    //     ],
    //     user4: [
    //         { slot: 2, slotColor: 'purple' },
    //         { slot: 3, slotColor: 'orange' },
    //     ],
    // };


    const groupedUserContents = messageUtil.groupMessage(userContents);

    console.log('Contents', groupedUserContents);

    for (const key of Object.keys(groupedUserContents)) {
        const slotIndexes = JSON.parse(key) as { slot: number; slotColor: string }[];
        const userIds = groupedUserContents[key];

        interface ISlotwColor extends ISlot {
            slotColor?: string;
        }
        const slots = [] as ISlotwColor[];

        slotIndexes.forEach((slotIndex) => {
            const slot = announcingSlots.find(
                (slot) => slot.slot === slotIndex.slot
            );

            if (slot) slots.push(slot);
            slots[slots.length -1].slotColor = slotIndex.slotColor;
        });

        const contents = slots
            .map((slot) => {
                if (!slot) {
                    return null;
                }

                const start = moment(slot.start).utcOffset(7).format('HH:mm');
                const end = moment(slot.end).utcOffset(7).format('HH:mm');

                const contactRegex = /(.+?) \((\d{3}-\d{3}-\d{4})\)/;

                const contactMatches = slot.contact.match(contactRegex);

                const content = flexTemplate.slotBubble({
                    slot: slot.slot,
                    department: slot.department,
                    start: start,
                    end: end,
                    event: slot.event,
                    location: slot.location,
                    note: slot.note,
                    contactName: contactMatches ? contactMatches[1] : '-',
                    contactTel: contactMatches ? contactMatches[2] : '-',
                    slotColor: slot.slotColor?? '#8B5CF6',
                });

                return content;
            })
            .filter((content) => content !== null) as FlexBubble[];

        const message = messageTemplate.flex({
            altText: slots
                .map((slot, index) => {
                    const start = moment(slot.start)
                        .utcOffset(7)
                        .format('HH:mm');
                    const end = moment(slot.end).utcOffset(7).format('HH:mm');
                    return `${slot.event} ${start}-${end} ${
                        index === slots.length - 1 ? '' : '|'
                    }`;
                })
                .join(' '),
            contents: {
                type: 'carousel',
                contents: contents,
            },
        });

        const replyData = {
            to: userIds,
            messages: [message],
        };

        console.log('user: ', userIds, 'text: ', message.altText);

        await messageUtil.sendMessage('multicast', replyData);
    }
    return announcingSlots;
};

const updateOffsetInSheet = async (sheet: string, updateData: any) => {
    await axios
        .post(process.env.AP_SHEET_API!, updateData, {
            params: {
                action: 'updateSlots',
                sheet,
            },
        })
        .then(() => {})
        .catch(() => {});
};

const setOffset = async (
    sheet: string,
    slot: number,
    offset: number,
    userId: string,
    displayName: string
) => {
    // const [slots, profile] = await Promise.all([findAll(), getProfile(userId)]);
    const slots = await findAll();

    if (!slots) throw new Error('slots is null');
    // if (!profile) throw new Error('profile is null');

    const targetSlots = slots.slice(slot - 1);

    const updatedSlots = [] as ISlot[];

    for (const slot of targetSlots) {
        const start = moment(slot.start)
            .utcOffset(7)
            .add(offset, 'minutes')
            .format();
        const end = moment(slot.end)
            .utcOffset(7)
            .add(offset, 'minutes')
            .format();
        const totalOffset = (slot.totalOffset??0)+offset;

        console.log(
            `${slot.slot}, ${moment(slot.start).format('HH:mm')} -> ${moment(
                start
            ).format('HH:mm')}, ${moment(slot.end).format('HH:mm')} -> ${moment(
                end
            ).format('HH:mm')}`
        );

        const updatedSlot = (await updateBySlot(slot.slot, {
            start,
            end,
            totalOffset,
        })) as ISlot;

        updatedSlots.push(updatedSlot);
    }

    const totalOffset = updatedSlots[0]?.totalOffset || 0;
    const sheetUpdateData = {} as Record<string, any>;

    for (const slot of updatedSlots) {
        sheetUpdateData[`B${slot.slot + 2}`] = moment(slot.start).format(
            'HH:mm'
        );
        sheetUpdateData[`C${slot.slot + 2}`] = moment(slot.end).format('HH:mm');
    }

    const content = flexTemplate.setOffsetBubble({ slot, offset, displayName, totalOffset });

    const message = messageTemplate.flex({
        altText: `${
            offset === 0 ? 0 : offset > 0 ? `+${offset}` : offset
        } นาที ตั้งแต่ Slot ที่ ${slot} เป็นต้นไป - "${totalOffset === 0 ? 'Set Zero' : `รวม ${totalOffset} นาที`}" โดย ${displayName} `,
        contents: content,
    });

    await Promise.all([
        updateOffsetInSheet(sheet, sheetUpdateData),
        messageUtil.sendMessage('broadcast', { messages: [message] }),
    ]);

    return updatedSlots;
};

export default {
    create,
    findAll,
    findOneBySlot,
    findAnnouncedSlots,
    findUpcomingSlots,
    updateBySlot,
    getSheet,
    syncSheet,
    findActiveSlots,
    announceSlots,
    multicastAnnounceSlots,
    updateOffsetInSheet,
    setOffset,
};
