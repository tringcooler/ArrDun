jQuery('document').ready(() => {
    
    const $ =  jQuery;
    
    const SCSYM = '▖▗▘▝ ▚▞ ▙▛▜▟';
    
    const sym_gen = function*() {
        while(true) {
            yield Symbol();
        }
    };
    
    const [
        
        PR_ELEM,
        PR_TAB_SIZE, PR_SEQ_LEN,
        PR_AB_TAB, PR_AB_SEQ,
        PR_AB_CB_INIT, PR_AB_CB_TAP,
        PR_GM_BOARD,
        FLG_AB_BUSSY,
        
        MTD_NEW_ELEM, MTD_NEW_UNIT, MTD_NEW_TAB,
        MTD_GETUNIT, MTD_DIST,
        MTD_GETSEQ, MTD_SHIFTSEQ,
        MTD_ON_TAP, MTD_FIND_TAB,
        
    ] = sym_gen();
    
    const
        CALLABLE = (f) => f instanceof Function,
        RLIM = (v, a, b) => Math.max(a, Math.min(b, v));
    
    class c_board {
        
        constructor(size, len, cb_init = null, cb_tap = null) {
            this[PR_TAB_SIZE] = size;
            this[PR_SEQ_LEN] = len;
            this[PR_AB_CB_INIT] = CALLABLE(cb_init) ? cb_init : null;
            this[PR_AB_CB_TAP] = CALLABLE(cb_tap) ? cb_tap : null;
            this[FLG_AB_BUSSY] = false;
        }
        
        [MTD_NEW_ELEM]() {
            let elem = $('<div>')
                .addClass('ars_board')
                .attr('id', 'ar_board');
            let [stelem, stab] = this[MTD_NEW_TAB]('seq', [this[PR_SEQ_LEN], 1]);
            let [mtelem, mtab] = this[MTD_NEW_TAB]('main', this[PR_TAB_SIZE], true);
            elem.append(stelem).append(mtelem);
            this[PR_AB_TAB] = mtab;
            this[PR_AB_SEQ] = stab;
            return elem;
        }
        
        [MTD_NEW_UNIT](val) {
            let uelem = $('<div>')
                .addClass('ars_unit');
            uelem.text(val);
            return uelem;
        }
        
        [MTD_NEW_TAB](name, size, tap = false) {
            let id = 'ar_tab_' + name;
            let [sw, sh] = size;
            let elem = $('<table>')
                .addClass('ars_tab')
                .attr('id', id);
            let tab = [];
            for(let y = 0; y < sh; y++) {
                let relem = $('<tr>').addClass('ars_row');
                elem.append(relem);
                let row = [];
                tab.push(row);
                for(let x = 0; x < sw; x++) {
                    let celem = $('<td>').addClass('ars_cell');
                    if(tap) {
                        celem.on('tap', e => this[MTD_ON_TAP]([x, y]));
                    }
                    relem.append(celem);
                    let v = this[PR_AB_CB_INIT]?.([x, y], name) ?? '';
                    let uelem = this[MTD_NEW_UNIT](v);
                    celem.append(uelem);
                    row.push(celem);
                }
            }
            return [elem, tab];
        }
        
        get elem() {
            if(!this[PR_ELEM]) {
                this[PR_ELEM] = this[MTD_NEW_ELEM]();
            }
            return this[PR_ELEM];
        }
        
        [MTD_GETUNIT](celem) {
            //return celem.find('.ars_unit');
            return celem.children(0);
        }
        
        [MTD_DIST](e1, e2) {
            if(!e1 || !e2) {
                return [0, 0];
            }
            let {left: left1, top: top1} = e1.offset();
            let {left: left2, top: top2} = e2.offset();
            return [left2 - left1, top2 - top1];
        }
        
        [MTD_GETSEQ](tab, spos, dir) {
            let th = tab.length;
            let tw = tab[0].length;
            let [sx, sy] = spos;
            let [dx, dy] = dir;
            let [ox, oy] = [0, 0];
            if(dx && dy) {
                throw Error('invalid direct');
            } else if(dx) {
                ox = -Math.sign(dx);
                sx = RLIM(sx + dx, 0, tw - 1);
                dx = RLIM(sx + ox * Infinity, 0, tw - 1);
                dy = sy;
            } else if(dy) {
                oy = -Math.sign(dy);
                sy = RLIM(sy + dy, 0, th - 1);
                dy = RLIM(sy + oy * Infinity, 0, th - 1);
                dx = sx;
            }
            let seq = [tab[sy][sx]];
            while(sx != dx || sy != dy) {
                sx += ox;
                sy += oy;
                seq.push(tab[sy][sx]);
            }
            return seq;
        }
        
        async [MTD_SHIFTSEQ](seq, extra = null,
            cb_take = null, cb_put = null,
            acb_shift = null, acb_hide = null, acb_show = null) {
            let loop = !extra;
            let slen = seq.length;
            let shift_seq = [];
            if(loop) {
                shift_seq.push([seq[slen - 1], seq[0]]);
            }
            for(let i = 0; i < slen - 1; i++) {
                shift_seq.push([seq[i], seq[i + 1]]);
            }
            let prms = [];
            if(!loop && CALLABLE(acb_hide)) {
                prms.push(acb_hide(seq[0]));
            }
            if(CALLABLE(acb_shift)) {
                for(let [d, s] of shift_seq) {
                    prms.push(acb_shift(d, s));
                }
            }
            if(prms.length > 0) {
                await Promise.all(prms);
            }
            if(CALLABLE(cb_take) && CALLABLE(cb_put)) {
                let first = null;
                let last = null;
                if(loop) {
                    shift_seq.pop();
                }
                for(let [d, s] of shift_seq) {
                    if(first === null) {
                        first = cb_take(d, true);
                    }
                    cb_put(d, cb_take(s, false), false);
                    last = s;
                }
                if(last) {
                    if(!loop) {
                        first = extra;
                    }
                    cb_put(last, first, true);
                }
            }
            if(!loop && CALLABLE(acb_show)) {
                await acb_show(extra);
            }
        }
        
        async shift(spos, dir, extra = null, rvs = false, dur = 200) {
            if(this[FLG_AB_BUSSY]) {
                throw Error('bussy');
            }
            this[FLG_AB_BUSSY] = true;
            let pushed = ((extra ?? null) !== null);
            if(!pushed) {
                dir = dir.map(v => v ? v * Infinity : 0);
            }
            let sseq = this[MTD_GETSEQ](this[PR_AB_TAB], spos, dir);
            if(pushed) {
                sseq = sseq.concat(
                    this[MTD_GETSEQ](this[PR_AB_SEQ], [1, 0], [-1, 0])
                );
            }
            if(rvs) {
                sseq.reverse();
            }
            let first = null;
            let exelem = null;
            if(pushed) {
                exelem = this[MTD_NEW_UNIT](extra);
                exelem.hide(0);
            }
            await this[MTD_SHIFTSEQ](sseq, exelem,
                (celem, isfirst) => {
                    let uelem = this[MTD_GETUNIT](celem);
                    uelem.remove();
                    if(pushed && isfirst) {
                        first = uelem;
                    }
                    return uelem;
                }, (celem, uelem, islast) => {
                    if(pushed && islast) {
                        //pass
                    }
                    uelem.css({'left': '', 'top': ''});
                    //console.log(uelem.text(), '->', celem[0]);
                    celem.append(uelem);
                }, async (dcel, scel) => {
                    let du = this[MTD_GETUNIT](dcel);
                    let su = this[MTD_GETUNIT](scel);
                    let [dx, dy] = this[MTD_DIST](su, du);
                    await su.animate({left: '+=' + dx, top: '+=' + dy}, dur).promise();
                }, async cel => {
                    await this[MTD_GETUNIT](cel).hide('fade', dur).promise();
                }, async uel => {
                    await uel.show('fade', dur).promise();
                },
            );
            this[FLG_AB_BUSSY] = false;
            return first;
        }
        
        [MTD_ON_TAP](pos) {
            if(this[FLG_AB_BUSSY]) {
                return;
            }
            this[PR_AB_CB_TAP]?.(pos);
        }
        
        [MTD_FIND_TAB](tab, val) {
            let rlen = tab.length;
            for(let y = 0; y < rlen; y++) {
                let row = tab[y];
                let clen = row.length;
                for(let x = 0; x < clen; x++) {
                    let celem = row[x];
                    let uelem = this[MTD_GETUNIT](celem);
                    if(uelem.text() === val) {
                        return [x, y];
                    }
                }
            }
            return [-1, -1];
        }
        
        findtab(val) {
            return this[MTD_FIND_TAB](this[PR_AB_TAB], val);
        }
        
        findseq(val) {
            return this[MTD_FIND_TAB](this[PR_AB_SEQ], val);
        }
        
    }
    let cnt = 0;
    class c_arrdun {
        
        constructor(size, slen) {
            this[PR_TAB_SIZE] = size;
            this[PR_SEQ_LEN] = slen;
            this[PR_GM_BOARD] = new c_board(
                size, slen,
                (p, n) => this.init_val(n, p[0], p[1]),
                p => this.move_to(p[0], p[1]),
            );
        }
        
        get board() {
            return this[PR_GM_BOARD];
        }
        
        init_val(n, x, y) {
            let [w, h] = this[PR_TAB_SIZE];
            if(n == 'main') {
                if(x == Math.floor(w / 2) && y == Math.floor(h / 2)) {
                    return '@';
                } else {
                    return ++cnt;//'->';
                }
            } else {
                return ++cnt+100;
            }
        }
        
        move_to(x, y) {
            let bd = this[PR_GM_BOARD];
            let [sx, sy] = bd.findtab('@');
            let dx = x - sx;
            let dy = y - sy;
            if(Math.abs(dx) + Math.abs(dy) !== 1) {
                return;
            }
            bd.shift([sx, sy], [dx, dy]);
        }
        
    }
    
    const scene = $('<div>').addClass('ars_scene');
    /*const*/ game = new c_arrdun([3, 5], 3);
    scene.append(game.board.elem);
    $('body').append(scene);
    
});