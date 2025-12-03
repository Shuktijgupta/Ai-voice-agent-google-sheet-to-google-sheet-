import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { status, name, phone, email } = body;

        // Update driver details
        const driver = await prisma.driver.update({
            where: { id },
            data: {
                ...(status && { status }),
                ...(name && { name }),
                ...(phone && { phone }),
                ...(email && { email }),
            },
        });

        return NextResponse.json(driver);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update driver' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Delete driver (cascade should handle relations if configured, otherwise we might need manual cleanup)
        // Prisma schema usually needs explicit cascade delete or we delete related records first.
        // Let's try simple delete first, assuming schema handles it or we catch error.

        // Manual cleanup for safety if cascade isn't set in DB
        await prisma.interviewResponse.deleteMany({ where: { driverId: id } });
        await prisma.call.deleteMany({ where: { driverId: id } });

        await prisma.driver.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete error:', error);
        return NextResponse.json({ error: 'Failed to delete driver' }, { status: 500 });
    }
}
