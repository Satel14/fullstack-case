const { resetTestDatabase } = require('./helpers/db');
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { CATEGORIES } = require('../scripts/lib/caseCatalog');

const managerPath = require.resolve('../src/redis/manager');
require.cache[managerPath] = {
    id: managerPath, filename: managerPath, loaded: true, exports: { getAllDataHashWithKey: async () => ({}) },
};

let activeSequelize;

test.after(async () => {
    if (activeSequelize) await activeSequelize.close();
});

test('GET /api/cases carries category slugs in priority order and preserves null for legacy categories', async (t) => {
    const sequelize = await resetTestDatabase();
    activeSequelize = sequelize;
    const { seedCases } = require('../scripts/seedCases');
    await seedCases({ log: { log() {}, warn() {}, error: console.error } });
    await sequelize.query(
        "INSERT INTO categories (id, title, priority, published) VALUES (2, 'Operation Cases', 95, 1), (3, 'Empty category', 110, 1) ON DUPLICATE KEY UPDATE title = VALUES(title), priority = VALUES(priority), published = VALUES(published)",
    );
    await sequelize.query(
        "INSERT INTO cases (id, title, price, categoryId, published, openedCount, openLimit) VALUES ('legacy', 'Legacy case', 10, 2, 1, 0, 1000)",
    );
    const app = express();
    require('../src/routes/case')(app);
    const server = await new Promise((resolve) => {
        const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
    });
    t.after(() => new Promise((resolve) => server.close(resolve)));

    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/cases`);
    assert.equal(response.status, 200);
    const answer = await response.json();
    assert.equal(answer.data.length, 75);
    const expected = [
        ...CATEGORIES.map(({ id, slug, title, priority }) => ({
            category_id: id, category_slug: slug, category_title: title, category_priority: priority,
        })),
        { category_id: 2, category_slug: null, category_title: 'Operation Cases', category_priority: 95 },
    ].sort((a, b) => b.category_priority - a.category_priority);
    assert.deepEqual(answer.categories.map(({ category_id, category_slug, category_title, category_priority }) => ({
        category_id, category_slug, category_title, category_priority,
    })), expected);
});
