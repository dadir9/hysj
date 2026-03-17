using Hysj.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Hysj.Api.Data;

public class HysjDbContext(DbContextOptions<HysjDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Device> Devices => Set<Device>();
    public DbSet<PreKey> PreKeys => Set<PreKey>();
    public DbSet<LoginAttempt> LoginAttempts => Set<LoginAttempt>();
    public DbSet<Group> Groups => Set<Group>();
    public DbSet<GroupMember> GroupMembers => Set<GroupMember>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(e =>
        {
            e.HasKey(u => u.Id);
            e.HasIndex(u => u.Username).IsUnique();
            e.Property(u => u.Username).HasMaxLength(50).IsRequired();
            e.HasIndex(u => u.PhoneNumber).IsUnique();
            e.Property(u => u.PhoneNumber).HasMaxLength(20).IsRequired();
            e.Property(u => u.PasswordHash).IsRequired();
        });

        modelBuilder.Entity<Device>(e =>
        {
            e.HasKey(d => d.Id);
            e.HasOne(d => d.User)
             .WithMany(u => u.Devices)
             .HasForeignKey(d => d.UserId)
             .OnDelete(DeleteBehavior.Cascade);
            e.Property(d => d.DeviceName).HasMaxLength(100).IsRequired();
        });

        modelBuilder.Entity<PreKey>(e =>
        {
            e.HasKey(p => p.Id);
            e.Property(p => p.Id).ValueGeneratedOnAdd();
            e.HasOne(p => p.Device)
             .WithMany(d => d.PreKeys)
             .HasForeignKey(p => p.DeviceId)
             .OnDelete(DeleteBehavior.Cascade);
            e.Property(p => p.IsUsed).HasDefaultValue(false);
        });

        modelBuilder.Entity<LoginAttempt>(e =>
        {
            e.HasKey(l => l.Id);
            e.Property(l => l.Id).ValueGeneratedOnAdd();
            e.Property(l => l.IpAddress).HasMaxLength(45).IsRequired();
            e.Property(l => l.Username).HasMaxLength(50).IsRequired();
            e.HasIndex(l => new { l.IpAddress, l.Timestamp });
        });

        modelBuilder.Entity<Group>(e =>
        {
            e.HasKey(g => g.Id);
            e.Property(g => g.Name).HasMaxLength(100).IsRequired();
            e.HasOne(g => g.CreatedBy)
             .WithMany()
             .HasForeignKey(g => g.CreatedByUserId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<GroupMember>(e =>
        {
            e.HasKey(gm => new { gm.GroupId, gm.UserId });
            e.Property(gm => gm.Alias).HasMaxLength(50).IsRequired();
            e.HasOne(gm => gm.Group)
             .WithMany(g => g.Members)
             .HasForeignKey(gm => gm.GroupId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(gm => gm.User)
             .WithMany()
             .HasForeignKey(gm => gm.UserId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(gm => new { gm.GroupId, gm.Alias }).IsUnique();
        });
    }
}
