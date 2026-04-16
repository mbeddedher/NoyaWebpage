import { query, withTransaction } from '~/lib/db';
import { NextResponse } from 'next/server';
import { ensureUniqueCategorySlug, slugifyTitle } from '~/lib/blogAdmin';

export async function GET() {
  try {
    const { rows } = await query(
      `SELECT id, name, slug, description
       FROM blog_categories
       ORDER BY name ASC`
    );
    return NextResponse.json({ categories: rows });
  } catch (error) {
    console.error('blog categories GET:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to load blog categories' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const name = String(body?.name || '').trim();
    const slugInput = body?.slug != null ? String(body.slug).trim() : '';
    const description = body?.description != null ? String(body.description).trim() : '';

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const baseSlug = (slugInput || slugifyTitle(name)).slice(0, 120);

    const category = await withTransaction(async (client) => {
      const slug = await ensureUniqueCategorySlug(client, baseSlug);
      const { rows } = await client.query(
        `INSERT INTO blog_categories (name, slug, description)
         VALUES ($1, $2, $3)
         RETURNING id, name, slug, description, created_at`,
        [name.slice(0, 100), slug, description || null]
      );
      return rows[0];
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error('blog categories POST:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create blog category' },
      { status: 500 }
    );
  }
}
