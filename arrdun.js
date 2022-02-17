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
        PR_AB_SIZE, PR_AB_SLEN,
        PR_AB_TAB, PR_AB_SEQ,
        
        MTD_NEW_ELEM, MTD_NEW_TAB,
        MTD_GETUNIT, MTD_DIST, MTD_CALC_TAB_SPC,
        MTD_GETSEQ, MTD_SHIFTSEQ,
        
    ] = sym_gen();
    
    const
        CALLABLE = (f) => f instanceof Function,
        RLIM = (v, a, b) => Math.max(a, Math.min(b, v));
    
    class c_board {
        
        constructor(size, len) {
            this[PR_AB_SIZE] = size;
            this[PR_AB_SLEN] = len;
        }
        
        [MTD_NEW_ELEM]() {
            let elem = $('<div>')
                .addClass('ars_board')
                .attr('id', 'ar_board');
            let [stelem, stab] = this[MTD_NEW_TAB]('ar_tab_seq', [ this[PR_AB_SLEN], 1]);
            let [mtelem, mtab] = this[MTD_NEW_TAB]('ar_tab_main', this[PR_AB_SIZE]);
            elem.append(stelem).append(mtelem);
            this[PR_AB_TAB] = mtab;
            this[PR_AB_SEQ] = stab;
            return elem;
        }
        
        [MTD_NEW_TAB](id, size) {
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
                    let celem = $('<td>').addClass('ars_cell')
                    relem.append(celem);
                    let uelem = $('<div>')
                        .addClass('ars_unit');
                    uelem.text('->');
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
            console.log('dist', left2, left1, top2, top1);
            return [left2 - left1, top2 - top1];
        }
        
        [MTD_CALC_TAB_SPC](tab) {
            let wspc = 0,
                hspc = 0;
            let sc = tab[0][0];
            if(!sc) {
                return [wspc, hspc];
            }
            let dc = tab[0][1];
            if(dc) {
                wspc = this[MTD_DIST](
                    this[MTD_GETUNIT](sc),
                    this[MTD_GETUNIT](dc),
                )[0];
            }
            dc = tab[1][0];
            if(dc) {
                hspc = this[MTD_DIST](
                    this[MTD_GETUNIT](sc),
                    this[MTD_GETUNIT](dc),
                )[1];
            }
            console.log('spc', wspc, hspc);
            return [wspc, hspc];
        }
        
        async popanim_slide(spos, doffs) {
            let [sx, sy] = spos;
            let celem = this[PR_AB_TAB][sy][sx];
            let uelem = this[MTD_GETUNIT](celem);
            let [cw, ch] = this[MTD_CALC_TAB_SPC](this[PR_AB_TAB]);
            let dx = cw * doffs[0];
            let dy = ch * doffs[1];
            await uelem.animate({
                left: '+=' + dx,
                top: '+=' + dy,
            }).promise();
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
        
        async shift(spos, dir, pushed) {
            if(pushed) {
                dir = dir.map(v => v ? v * Infinity : 0);
            }
            let sseq = this[MTD_GETSEQ](this[PR_AB_TAB], spos, dir);
            if(pushed) {
                sseq = sseq.concat(
                    this[MTD_GETSEQ](this[PR_AB_SEQ], [1, 0], [-1, 0])
                );
            }
            let first = null;
            let msf = m => (...na) => console.log(m, ...na);
            await this[MTD_SHIFTSEQ](sseq, pushed,
                (celem, isfirst) => {
                    let uelem = this[MTD_GETUNIT](celem);
                    uelem.remove();
                    if(pushed && isfirst) {
                        first = uelem;
                    }
                    return uelem;
                }, (celem, uelem, islast) => {
                    if(islast) return;
                    uelem.attr('left', '').attr('top', '');
                    celem.append(uelem);
                },
                msf('shift'), msf('hide'), msf('show'),
            );
            return first;
        }
        
    }
    
    const scene = $('<div>').addClass('ars_scene');
    /*const*/ board = new c_board([3, 5], 3);
    scene.append(board.elem);
    $('body').append(scene);
    
    //getseq = (sp, d) => board[MTD_GETSEQ](board[PR_AB_TAB], sp, d).map(v=>v[0]);
    
});