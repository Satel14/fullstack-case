const cases = [
    {
        name: 'Case Prime',
        id: 1,
        price: 300,
        img: 'https://steamcommunity-a.akamaihd.net/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXU5A1PIYQNqhpOSV-fRPasw8rsUFJ5KBFZv668FFU1nfbOIj8W7oWzkYLdlPOsMOmIk2kGscAj2erE99Sn2AGw_0M4NW2hIYOLMlhpcmY0CRM/256fx198f',
        items: [
            {
                itemId: 1,
                name: 'Food chain',
                type: 'pp',
                rare: 'classified',
                chance: 4,
                painted: 'default',
                img:
              'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou6r8FAR17P7YKAJE49Oyq4ODlv76DLfYkWNFppAp07zHoY_20ALg-EtrMm_ydYWSegU6ZljQ-Vbrx7u7hJ-5v8vOnSR9-n51oTWxmVM/140fx105f/image.png',
            },
            {
                itemId: 2,
                name: 'Flashback',
                type: 'assaultrifles',
                rare: 'classified',
                chance: 4,
                painted: 'default',
                img:
              'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou-6kejhz2v_Nfz5H_uO1gb-Gw_alDL3dl3hZ6sRygdbM8Ij8nVn6r0FtN2-gJteVIFJoNF6E_1O4k-rthMO66J3InHdhviBx7X2LnhaxhwYMMLKHMI1gQw/140fx105f/image.png',
            },
            {
                itemId: 3,
                name: 'Redline',
                type: 'assaultrifles',
                rare: 'classified',
                chance: 4,
                painted: 'default',
                img:
              'https://community.cloudflare.steamstatic.com/economy/image/fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZYMUrsm1j-9xgEObwgfEh_nvjlWhNzZCveCDfIBj98xqodQ2CZknz56P7fiDzRyTQXJVfdhX_o45gnTBCI24dJuGtay8-MEew_n4YCTNOMuNNhLF8GDU6KDNFipvEg-gfRfLp2PpXi82Hz3ejBdOj7r2Ww/140fx105f/image.png',
            },
            {
                itemId: 4,
                name: 'Asiimov',
                type: 'assaultrifles',
                rare: 'classified',
                chance: 4,
                painted: 'default',
                img:
              'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV092lnYmGmOHLP7LWnn8fvpMkjOqS99Smiwzk_0VvamH0LIHEdwFqYw2G_QC3lefsjZS4uJXLyWwj5HclxVTx0A/140fx105f/image.png',
            },
            {
                itemId: 5,
                name: 'Desolate Space',
                type: 'assaultrifles',
                rare: 'classified',
                chance: 4,
                painted: 'default',
                img:
              'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou-6kejhjxszFJTwW09izh4-HluPxDKjBl2hU18h0juDU-MKt0Fex-kpkMTumJobEdlU7ZFCF-AO4wOnv0Mft752azyRh7CZ2ty2MgVXp1k8SoycS/140fx105f/image.png',
            },
            {
                itemId: 6,
                name: 'Neo-Noir',
                type: 'assaultrifles',
                rare: 'classified',
                chance: 4,
                painted: 'default',
                img:
              'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou-6kejhjxszFJTwW09Kzm7-FmP7mDLfYkWNFpsch2evFo9Wl2lflr0RtZzilJNTBdgE3ZAyDr1nrx-vs0cK9vsmamnt9-n51UgTl8ms/140fx105f/image.png',
            },
            {
                itemId: 7,
                name: 'Player Two',
                type: 'assaultrifles',
                rare: 'classified',
                chance: 4,
                painted: 'default',
                img:
              'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou-6kejhz2v_Nfz5H_uO1gb-Gw_alIITShWxeupUl0tbN_Iv9nBri_kBtYWv2d9eXcAI6YF6ErFXqkui-1Je-75ucmicyvyggt36InhS3n1gSOc6J6LtH/140fx105f/image.png',
            },
            {
                itemId: 8,
                name: 'Neon Revolution',
                type: 'assaultrifles',
                rare: 'classified',
                chance: 4,
                painted: 'default',
                img:
              'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV0924lZKIn-7LPr7Vn35cppwl3OyVp9Txi1Gy_0Y9MDjyd4fGJFVsZFGG-gC5xLvo1pfouJ3Bzyd9-n51-K95osI/140fx105f/image.png',
            },
            {
                itemId: 9,
                name: 'Legion of Anubis',
                type: 'assaultrifles',
                rare: 'classified',
                chance: 4,
                painted: 'default',
                img:
              'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV0924gYKChMj4OrzZgiUGv5wo3uuY8dr02lLn-0FsMGmgIdfEelU3Ml-G_VG9xOm7gZC87suf1zI97aiJAbeK/140fx105f/image.png',
            },
            {
                itemId: 10,
                name: 'Magnesium',
                type: 'assaultrifles',
                rare: 'classified',
                chance: 4,
                painted: 'default',
                img:
              'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou-6kejhnwMzFJTwW09--m5CbkuXLNLPehX9u5Mx2gv2Pptuh0QXnrxJoamvwJ4SXcVJrZQuB-wfowee-h5bv75-YziNqviIq7WGdwULQRBs-zw/140fx105f/image.png',
            },
            {
                itemId: 11,
                name: 'Bullet Rain',
                type: 'assaultrifles',
                rare: 'classified',
                chance: 4,
                painted: 'default',
                img:
              'https://community.cloudflare.steamstatic.com/economy/image/fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZYMUrsm1j-9xgEObwgfEh_nvjlWhNzZCveCDfIBj98xqodQ2CZknz52YOLkDzRyTQbXDaxbSMoo9QHiNipm6ZZcWdKy_q4LZ13mt4LBNOYvMtlOHpWDXvePNVuv4ks6gfBcKJfco3zt2yy_OT8CDRH1ujVTbUp_gdk/140fx105f/image.png',
            },
            {
                itemId: 12,
                name: 'Hyper Beast',
                type: 'assaultrifles',
                rare: 'classified',
                chance: 4,
                painted: 'default',
                img:
              'https://community.cloudflare.steamstatic.com/economy/image/fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZYMUrsm1j-9xgEObwgfEh_nvjlWhNzZCveCDfIBj98xqodQ2CZknz52YOLkDyRufgHMAqVMY_YvywW4CHYN4N5zUcWJ9b4HOkiA6deSavVxLt0aG5GCCKDQMgn-4kMxgaVYJ5CA9iO-3y-9OT8JDUXirD4GneXT6LJ1wjFBrFMBOCI/140fx105f/image.png',
            },
            {
                itemId: 13,
                name: 'In Living Color',
                type: 'assaultrifles',
                rare: 'classified',
                chance: 4,
                painted: 'default',
                img:
              'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou-6kejhjxszFJTwW09C5goW0m_7zO6-fw20G7pNw2bmZoI3wjFflqktraz2nJYadegc_ZVyF_Vm3yb_t0cS_6IOJlyXmINWx1g/140fx105f/image.png',
            },
            {
                itemId: 14,
                name: 'Azimov',
                type: 'assaultrifles',
                rare: 'classified',
                chance: 4,
                painted: 'default',
                img:
                    'https://community.akamai.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou-6kejhjxszFJQJD_9W7m5a0mvLwOq7cqWdQ-sJ0xOvEpIj0jAbkqEE_ZD3xctLGJAE_Zw7U-QTowefth8TpvM_InHZh6XQ8pSGKWYJAoJI/360fx360f',
            },
            {
                itemId: 15,
                name: 'Glock-18 Gradient',
                type: 'assaultrifles',
                rare: 'classified',
                chance: 4,
                painted: 'default',
                img:
                    'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgposbaqKAxf0vL3dzxG6eO6nYeDg7miYr7VlWgHscN32LyT8dmm31XgrxdtZzvzJYDGIFM2Y16D-FfvlOu9m9bi66Oq9HyE/140fx105f/image.png',
            },
            {
                itemId: 16,
                name: '★ M9 bayonet knife | Legends',
                type: 'assaultrifles',
                rare: 'classified',
                chance: 4,
                painted: 'default',
                img:
                    'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf3qr3czxb49KzgL-Igsj5aoTTl3Ju5Mpjj9bN_Iv9nBq2_xE6Mmv1cIOSclI6ZViFr1XtwertgZK6vJiYwXNjuSEr5XaJzhfhn1gSOWAjuI7h/140fx105f/image.png',
            },
            {
                itemId: 17,
                name: '',
                type: 'assaultrifles',
                rare: 'classified',
                chance: 4,
                painted: 'default',
                img:
                    'https://community.cloudflare.steamstatic.com/economy/image/fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZYMUrsm1j-9xgEObwgfEh_nvjlWhNzZCveCDfIBj98xqodQ2CZknz56I_OKMyJYdAXUBKxfY_Qt5DfhDCM7_cotA4Lhr7lSLQ_tt4GVYrl4MY1IGJOGX_fTYF-p6E1u0qJVL5GB8S-9jDOpZDknDIyvzQ/140fx105f/image.png',
            },
            {
                itemId: 17,
                name: '',
                type: 'assaultrifles',
                rare: 'classified',
                chance: 4,
                painted: 'default',
                img:
                    'https://community.cloudflare.steamstatic.com/economy/image/fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZYMUrsm1j-9xgEObwgfEh_nvjlWhNzZCveCDfIBj98xqodQ2CZknz56P7fiDz9-TQXJVfdSXfgF-Q3oADI_ppdnDdK18e4CLQ_v5YeQMuYkMtEdHpLYWP7XMw6v60xpiKhfJpWBpCrxnXO-X5QNkco/140fx105f/image.png',
            },
            {
                itemId: 17,
                name: '',
                type: 'assaultrifles',
                rare: 'classified',
                chance: 4,
                painted: 'default',
                img:
                    'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV08y5nY6fqPP9ILrDhGpI18h0juDU-MLx2gKy8xFqMDr2IIORcAU6MlnS_Vjtxu7rhcK-u5-cyXZqsiEg7HnUgVXp1kpd_x09/140fx105f/image.png',
            },
            {
                itemId: 17,
                name: '',
                type: 'assaultrifles',
                rare: 'classified',
                chance: 4,
                painted: 'default',
                img:
                    'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV09-5k5SDnvnzIITdn2xZ_IsoiL2XotT03wS3-EJpNmynIobEcAY9ZVvWqFbvyOu80ZLvucmamnpqpGB8sq6j9EZr/140fx105f/image.png',
            },
            {
                itemId: 17,
                name: '',
                type: 'assaultrifles',
                rare: 'classified',
                chance: 4,
                painted: 'default',
                img:
                    'https://community.cloudflare.steamstatic.com/economy/image/fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZYMUrsm1j-9xgEObwgfEh_nvjlWhNzZCveCDfIBj98xqodQ2CZknz56P7fiDzZ2TQXJVfdhX_Qo4A3gNio37M52WZmz9e0ALAjttYKVN7QvZtxEG8nXCPXSYwD970huiKgLK8Daoim-ji7oJC5UDGS-VkfD/140fx105f/image.png',
            },
            {
                itemId: 17,
                name: '',
                type: 'assaultrifles',
                rare: 'classified',
                chance: 4,
                painted: 'default',
                img:
                    'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf2PLacDBA5ciJk5O0nPbmMrbul35F59FjhefI9rP5gVO8v11pMj_1d4eVelVrYlCG_VDowefpgcC97s-dyXQx6SQqtn6JnECyhR5OcKUx0sEUJJZ_/140fx105f/image.png',
            },
            {
                itemId: 17,
                name: '',
                type: 'assaultrifles',
                rare: 'classified',
                chance: 4,
                painted: 'default',
                img:
                    'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DeXEl7NwdOtbagFABs3OXNYgJP48i5hoOSlPvxDLbemGRu6sp-h9bM8Ij8nVn6qkZoN2qlIYHHd1Q-YQ2F-QTrle7vhZa8uZnNmHprsiIg7S7fnBWw1wYMMLL5HY2qBw/140fx105f/image.png',
            },
            {
                itemId: 17,
                name: '',
                type: 'assaultrifles',
                rare: 'classified',
                chance: 4,
                painted: 'default',
                img:
                    'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DfVlxgLQFFibKkJQN3wfLYYgJK7dKyg5KKh8j3MrbeqWxD7dxOh-zF_Jn4xlCyrktsZmvxINLBdw9vNA7T_Fbrx73vjJPptJucnHdqvCJwsSyImBypwUYblwFxuLY/140fx105f/image.png',
            },
            {
                itemId: 17,
                name: '',
                type: 'assaultrifles',
                rare: 'classified',
                chance: 4,
                painted: 'default',
                img:
                    'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DAQ1h3LAVbv6mxFABs3OXNYgJR_Nm1nYGHnuTgDL_VhmpF18Jjj-zPyo_0hVuLphY4OiyuOoTDdgFoMArYrAS7l7_rg5W-7pzOmnRq7yUnty7YyRSzhUpEZ7Ft1_2ACQLJ0i7bxGA/140fx105f/image.png',
            },
        ],
    },
];

export default cases;
