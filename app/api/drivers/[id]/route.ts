import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { status, responses } = body;

        // Update driver status
        const driver = await prisma.driver.update({
            where: { id },
            data: { status },
        });

        // If there are responses, we might want to save them too, 
        // but for now the schema separates them into InterviewResponse.
        // We'll handle InterviewResponse creation in a separate call or here if needed.
        // For this iteration, we just update status.

        return NextResponse.json(driver);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update driver' }, { status: 500 });
    }
}
