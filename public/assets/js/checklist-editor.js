(() => {
    document.querySelectorAll('[data-checklist-editor]').forEach((form) => {
        const list = form.querySelector('[data-choice-list]');
        let next = list.children.length;
        const message = form.querySelector('[data-choice-message]');
        form.querySelector('[data-add-choice]').addEventListener('click', () => {
            const active = [...list.querySelectorAll('[data-choice-deleted]')].filter(input => input.value !== '1').length;
            if (active >= 30) { message.textContent = 'Use up to 30 choices.'; return; }
            const index = next++;
            const html = form.querySelector('[data-choice-template]').innerHTML
                .replaceAll('__INDEX__', String(index)).replaceAll('__ID__', String(-index - 1));
            list.insertAdjacentHTML('beforeend', html);
            list.lastElementChild.querySelector('[data-choice-label]').focus();
            message.textContent = 'Choice added. Save when ready.';
        });
        list.addEventListener('click', event => {
            const button = event.target.closest('[data-delete-choice]');
            if (!button) return;
            const card = button.closest('[data-choice-card]');
            if (Number(card.querySelector('[data-choice-id]').value) < 0) { card.remove(); return; }
            const deleted = card.querySelector('[data-choice-deleted]');
            const remove = deleted.value !== '1';
            deleted.value = remove ? '1' : '0';
            const fields = card.querySelector('[data-choice-fields]');
            fields.hidden = remove;
            fields.disabled = remove;
            button.textContent = remove ? 'Undo delete' : 'Delete choice';
            card.querySelector('[data-choice-heading]').textContent = remove ? 'Will be deleted on save' : 'Choice';
            message.textContent = remove ? 'Past report answers will stay unchanged.' : '';
        });
        list.addEventListener('change', event => {
            if (!event.target.matches('[data-choice-kind]')) return;
            const card = event.target.closest('[data-choice-card]');
            const kind = event.target.value;
            const regular = kind === 'standard';
            const labels = {all_of_the_above: 'All of the above', unknown: 'Not Sure', none_of_the_above: 'None of the above'};
            card.querySelector('[data-choice-points-wrap]').hidden = !regular;
            card.querySelector('[data-choice-points]').value = '0';
            card.querySelector('[data-choice-points]').required = regular;
            const rule = card.querySelector('[data-choice-rule]');
            rule.hidden = regular;
            rule.textContent = kind === 'unknown' ? 'Unscored; needs review.' : kind === 'none_of_the_above' ? 'Adds 0 points.' : 'Uses the automatic All choices rule for this checklist.';
            card.querySelector('[data-choice-label]').value = labels[kind] || '';
        });
    });
})();
